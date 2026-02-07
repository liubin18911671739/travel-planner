/**
 * Gamma API Client
 *
 * Wrapper for the Gamma presentation API with retry logic.
 * Gamma URLs are temporary - always persist exports to Storage immediately.
 */

const GAMMA_API_BASE = 'https://api.gamma.app'
const GAMMA_MAX_RETRIES = 3
const GAMMA_RETRY_DELAY_BASE = 1000 // ms
const GAMMA_TIMEOUT = 120000 // 2 minutes

/**
 * Options for creating a new Gamma deck.
 */
export interface CreateDeckOptions {
  title: string
  description?: string
  content: GammaSlideContent[]
}

/**
 * Slide content structure.
 */
export interface GammaSlideContent {
  title?: string
  content: string
  bullets?: string[]
  image?: string
}

/**
 * Gamma deck creation result.
 */
export interface GammaDeck {
  deckId: string
  deckUrl: string
  editUrl?: string
}

/**
 * Export result with downloadable buffer.
 */
export interface GammaExportResult {
  url: string
  format: 'pdf' | 'pptx'
  buffer: Buffer
}

/**
 * Deck status.
 */
export interface DeckStatus {
  status: 'processing' | 'ready' | 'failed'
  ready: boolean
}

/**
 * Custom error for Gamma operations.
 */
export class GammaError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'GammaError'
  }
}

/**
 * Gamma API client with retry logic.
 */
export class GammaClient {
  private readonly apiKey: string
  private readonly apiBase: string

  constructor(config?: { apiKey?: string; apiBase?: string }) {
    this.apiKey = config?.apiKey || process.env.GAMMA_API_KEY || ''
    // Don't throw during construction - throw on first use instead
    this.apiBase = config?.apiBase || process.env.GAMMA_API_URL || GAMMA_API_BASE
  }

  private getApiKey(): string {
    if (!this.apiKey && !process.env.GAMMA_API_KEY) {
      throw new Error('GAMMA_API_KEY environment variable is required')
    }
    return this.apiKey || process.env.GAMMA_API_KEY!
  }

  /**
   * Create a new presentation deck.
   *
   * @param options - Deck creation options
   * @returns Deck ID and URL
   */
  async createDeck(options: CreateDeckOptions): Promise<GammaDeck> {
    return this.withRetry(async () => {
      const response = await fetch(`${this.apiBase}/v1/decks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: options.title,
          description: options.description,
          slides: this.convertContentToSlides(options.content),
        }),
        signal: AbortSignal.timeout(GAMMA_TIMEOUT),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new GammaError(
          `Failed to create deck: ${response.statusText} - ${body}`,
          response.status,
          this.isRetryable(response.status)
        )
      }

      const data = await response.json()
      return {
        deckId: data.id,
        deckUrl: data.url,
        editUrl: data.edit_url,
      }
    })
  }

  /**
   * Export a deck to PDF or PPTX format.
   * IMPORTANT: Gamma URLs are temporary, always persist to Storage.
   *
   * @param deckId - Deck ID to export
   * @param format - Export format
   * @returns Export result with downloadable buffer
   */
  async exportDeck(
    deckId: string,
    format: 'pdf' | 'pptx' = 'pdf'
  ): Promise<GammaExportResult> {
    return this.withRetry(async () => {
      // First ensure deck is ready
      await this.waitForDeckReady(deckId)

      // Request export
      const response = await fetch(`${this.apiBase}/v1/decks/${deckId}/export`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
        signal: AbortSignal.timeout(GAMMA_TIMEOUT),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new GammaError(
          `Failed to export deck: ${response.statusText} - ${body}`,
          response.status,
          this.isRetryable(response.status)
        )
      }

      const data = await response.json()

      // Immediately download the file (Gamma URLs are temporary)
      const downloadResponse = await fetch(data.downloadUrl)
      if (!downloadResponse.ok) {
        throw new GammaError('Failed to download export')
      }

      const buffer = Buffer.from(await downloadResponse.arrayBuffer())

      return {
        url: data.downloadUrl,
        format,
        buffer,
      }
    })
  }

  /**
   * Get the current status of a deck.
   *
   * @param deckId - Deck ID
   * @returns Deck status
   */
  async getDeckStatus(deckId: string): Promise<DeckStatus> {
    const response = await fetch(`${this.apiBase}/v1/decks/${deckId}`, {
      headers: {
        Authorization: `Bearer ${this.getApiKey()}`,
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new GammaError(`Failed to get deck status: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      status: data.status || 'processing',
      ready: data.status === 'ready',
    }
  }

  /**
   * Wait for a deck to be ready (polling).
   *
   * @param deckId - Deck ID
   * @param maxWaitMs - Maximum time to wait (default: 2 minutes)
   */
  async waitForDeckReady(
    deckId: string,
    maxWaitMs: number = 120000
  ): Promise<void> {
    const startTime = Date.now()
    const pollInterval = 2000 // 2 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getDeckStatus(deckId)

      if (status.ready) {
        return
      }

      if (status.status === 'failed') {
        throw new GammaError('Deck generation failed')
      }

      await this.delay(pollInterval)
    }

    throw new GammaError('Deck generation timed out')
  }

  /**
   * Convert itinerary content to Gamma slide format.
   * This is a placeholder - implement based on your content structure.
   */
  private convertContentToSlides(content: GammaSlideContent[]): any[] {
    return content.map((slide) => ({
      blocks: [
        {
          type: 'heading',
          content: slide.title || '',
        },
        {
          type: 'paragraph',
          content: slide.content,
        },
        ...(slide.bullets || []).map((bullet) => ({
          type: 'bullet',
          content: bullet,
        })),
      ],
    }))
  }

  /**
   * Execute a function with exponential backoff retry.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = GAMMA_MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (error instanceof GammaError) {
          // Don't retry non-retryable errors
          if (!error.retryable) {
            throw error
          }

          // Don't retry client errors (4xx)
          if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
            throw error
          }
        }

        if (attempt < maxRetries - 1) {
          const delay = GAMMA_RETRY_DELAY_BASE * Math.pow(2, attempt)
          await this.delay(delay)
        }
      }
    }

    throw lastError || new GammaError('Operation failed after retries')
  }

  /**
   * Check if a status code is retryable.
   */
  private isRetryable(statusCode: number): boolean {
    return (
      statusCode === 408 || // Request Timeout
      statusCode === 429 || // Too Many Requests
      statusCode >= 500 // Server errors
    )
  }

  /**
   * Delay helper.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Default Gamma client instance.
 */
export const gammaClient = new GammaClient()
