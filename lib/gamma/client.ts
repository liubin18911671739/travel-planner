/**
 * Gamma API Client (v1.0)
 *
 * Uses asynchronous generations API:
 * 1. POST /generations
 * 2. GET /generations/:id (polling)
 *
 * Auth header: X-API-KEY
 */

const GAMMA_API_BASE = 'https://public-api.gamma.app/v1.0'
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
 * Deck status (legacy compatibility shape).
 */
export interface DeckStatus {
  status: 'processing' | 'ready' | 'failed'
  ready: boolean
}

export type GammaTextMode = 'generate' | 'condense' | 'rewrite'
export type GammaFormat = 'presentation' | 'social' | 'webpage' | 'document'
export type GammaExportFormat = 'pdf' | 'pptx'

export interface GammaGenerationPayload {
  inputText: string
  textMode?: GammaTextMode
  format?: GammaFormat
  cardSplit?: 'auto' | 'inputTextBreaks'
  numCards?: number
  cardOptions?: {
    dimensions?: string
  }
  imageOptions?: {
    source?: 'webAllImages' | 'aiGenerated'
    style?: string
    model?: string
  }
  sharingOptions?: {
    externalAccess?: 'view' | 'none'
  }
  textOptions?: {
    audience?: string
    tone?: string
  }
  themeId?: string
  exportAs?: GammaExportFormat
}

export interface GammaGenerationStatus {
  generationId: string
  status: string
  url?: string
  editUrl?: string
  fileUrl?: string
  raw: Record<string, unknown>
}

export interface GammaTheme {
  id: string
  name: string
  toneKeywords?: string[]
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function pickString(
  source: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return undefined
}

function isCompletedStatus(status: string): boolean {
  return status === 'completed' || status === 'ready' || status === 'done'
}

function isFailedStatus(status: string): boolean {
  return status === 'error' || status === 'failed'
}

/**
 * Gamma API client with retry logic.
 */
export class GammaClient {
  private readonly apiKey: string
  private readonly apiBase: string

  constructor(config?: { apiKey?: string; apiBase?: string }) {
    this.apiKey = config?.apiKey || process.env.GAMMA_API_KEY || ''
    this.apiBase = config?.apiBase || process.env.GAMMA_API_URL || GAMMA_API_BASE
  }

  private getApiKey(): string {
    if (!this.apiKey && !process.env.GAMMA_API_KEY) {
      throw new Error('GAMMA_API_KEY environment variable is required')
    }
    return this.apiKey || process.env.GAMMA_API_KEY!
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.getApiKey(),
    }
  }

  private buildErrorMessage(status: number, body: string): string {
    if (status === 401) {
      return `认证失败 (Unauthorized): 请检查 API Key。Raw: ${body}`
    }
    if (status === 403) {
      return `积分不足 (No Credits) 或 权限禁止。Raw: ${body}`
    }
    if (status === 429) {
      return `请求过频 (Rate Limit)。Raw: ${body}`
    }
    return `Gamma API error ${status}: ${body}`
  }

  private isRetryableStatus(statusCode: number): boolean {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500
  }

  private async requestJson(
    path: string,
    init: RequestInit
  ): Promise<Record<string, unknown>> {
    return this.withRetry(async () => {
      const response = await fetch(`${this.apiBase}${path}`, {
        ...init,
        signal: AbortSignal.timeout(GAMMA_TIMEOUT),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new GammaError(
          this.buildErrorMessage(response.status, body),
          response.status,
          this.isRetryableStatus(response.status)
        )
      }

      const payload = (await response.json()) as unknown
      if (!isRecord(payload)) {
        throw new GammaError('Gamma API returned non-object payload')
      }

      return payload
    })
  }

  private normalizeGenerationStatus(
    payload: Record<string, unknown>
  ): GammaGenerationStatus {
    const generationId =
      pickString(payload, ['generationId', 'generation_id', 'id']) || ''
    const status =
      pickString(payload, ['status']) ||
      (generationId ? 'processing' : 'unknown')
    const url = pickString(payload, ['url', 'deckUrl', 'deck_url'])
    const editUrl = pickString(payload, ['editUrl', 'edit_url'])
    const fileUrl = pickString(payload, ['file_url', 'fileUrl', 'downloadUrl'])

    return {
      generationId,
      status,
      url,
      editUrl,
      fileUrl,
      raw: payload,
    }
  }

  /**
   * Create an async generation.
   */
  async createGeneration(
    payload: GammaGenerationPayload
  ): Promise<GammaGenerationStatus> {
    const data = await this.requestJson('/generations', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    })

    const normalized = this.normalizeGenerationStatus(data)
    if (!normalized.generationId) {
      throw new GammaError('Gamma API response missing generationId')
    }
    return normalized
  }

  /**
   * Get generation status by id.
   */
  async getGenerationStatus(
    generationId: string
  ): Promise<GammaGenerationStatus> {
    const data = await this.requestJson(`/generations/${generationId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })
    const normalized = this.normalizeGenerationStatus(data)
    return {
      ...normalized,
      generationId: normalized.generationId || generationId,
    }
  }

  /**
   * Poll status until generation is completed or failed.
   */
  async waitForCompletion(
    generationId: string,
    pollIntervalSec: number = 3,
    timeoutSec: number = 120
  ): Promise<GammaGenerationStatus> {
    const start = Date.now()
    const timeoutMs = timeoutSec * 1000

    while (Date.now() - start < timeoutMs) {
      const result = await this.getGenerationStatus(generationId)
      const status = result.status.toLowerCase()

      if (isCompletedStatus(status)) {
        return result
      }
      if (isFailedStatus(status)) {
        throw new GammaError(`Gamma generation failed: ${JSON.stringify(result.raw)}`)
      }

      await this.delay(pollIntervalSec * 1000)
    }

    throw new GammaError(`Gamma generation timed out: ${generationId}`)
  }

  /**
   * Generate travel planner cards (social 9x16 + web images).
   */
  async generateTravelPlan(options: {
    destination: string
    days: number
    prompt?: string
  }): Promise<GammaGenerationStatus> {
    const prompt =
      options.prompt ||
      `Create a detailed ${options.days}-day itinerary for ${options.destination}.`

    const created = await this.createGeneration({
      inputText: prompt,
      textMode: 'generate',
      format: 'social',
      cardOptions: { dimensions: '9x16' },
      numCards: options.days,
      imageOptions: { source: 'webAllImages' },
      sharingOptions: { externalAccess: 'view' },
      exportAs: 'pdf',
    })

    return this.waitForCompletion(created.generationId, 3, 180)
  }

  /**
   * Generate a news microsite from multiple short items.
   */
  async generateNewsMicrosite(newsItems: string[]): Promise<GammaGenerationStatus> {
    const inputText = `# Daily Briefing\n\n${newsItems.join('\n---\n')}`
    const created = await this.createGeneration({
      inputText,
      textMode: 'generate',
      format: 'webpage',
      cardSplit: 'inputTextBreaks',
      imageOptions: { source: 'webAllImages' },
      textOptions: {
        audience: 'industry professionals',
        tone: 'informative',
      },
    })
    return this.waitForCompletion(created.generationId, 3, 120)
  }

  /**
   * Condense long-form blog text into social cards.
   */
  async blogToCarousel(
    longText: string,
    numCards: number = 7
  ): Promise<GammaGenerationStatus> {
    const created = await this.createGeneration({
      inputText: longText,
      textMode: 'condense',
      format: 'social',
      cardOptions: { dimensions: '4x5' },
      numCards,
      imageOptions: {
        source: 'aiGenerated',
        style: 'minimalist, vector art, flat design',
      },
    })
    return this.waitForCompletion(created.generationId, 3, 120)
  }

  /**
   * List available themes.
   */
  async listThemes(limit: number = 10): Promise<GammaTheme[]> {
    const data = await this.requestJson(`/themes?limit=${limit}`, {
      method: 'GET',
      headers: { 'X-API-KEY': this.getApiKey() },
    })

    const rawThemes = Array.isArray(data.data) ? data.data : []
    return rawThemes
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((theme) => ({
        id: pickString(theme, ['id']) || '',
        name: pickString(theme, ['name']) || '',
        toneKeywords: Array.isArray(theme.toneKeywords)
          ? theme.toneKeywords.filter(
              (item): item is string => typeof item === 'string'
            )
          : undefined,
      }))
      .filter((theme) => theme.id && theme.name)
  }

  /**
   * Backward-compatible deck creation wrapper.
   * Internally uses generations API.
   */
  async createDeck(options: CreateDeckOptions): Promise<GammaDeck> {
    const created = await this.createGeneration({
      inputText: this.convertContentToInputText(options),
      textMode: 'generate',
      format: 'presentation',
      numCards: options.content.length,
      sharingOptions: { externalAccess: 'view' },
    })

    const result = await this.waitForCompletion(created.generationId, 3, 180)
    if (!result.url) {
      throw new GammaError('Gamma generation completed without url')
    }

    return {
      deckId: result.generationId,
      deckUrl: result.url,
      editUrl: result.editUrl,
    }
  }

  /**
   * Generate and download exported file directly from content.
   */
  async exportFromContent(
    options: CreateDeckOptions,
    format: GammaExportFormat
  ): Promise<GammaExportResult> {
    const created = await this.createGeneration({
      inputText: this.convertContentToInputText(options),
      textMode: 'generate',
      format: 'presentation',
      numCards: options.content.length,
      sharingOptions: { externalAccess: 'view' },
      exportAs: format,
    })

    const result = await this.waitForCompletion(created.generationId, 3, 240)
    const fileUrl = result.fileUrl
    if (!fileUrl) {
      throw new GammaError(
        `Gamma generation completed without file_url (format=${format})`
      )
    }

    const downloadResponse = await fetch(fileUrl, {
      signal: AbortSignal.timeout(GAMMA_TIMEOUT),
    })
    if (!downloadResponse.ok) {
      throw new GammaError(`Failed to download Gamma export: ${downloadResponse.status}`)
    }

    return {
      url: fileUrl,
      format,
      buffer: Buffer.from(await downloadResponse.arrayBuffer()),
    }
  }

  /**
   * Legacy compatibility:
   * export from existing generation id only works when that generation
   * was created with exportAs and already has file_url.
   */
  async exportDeck(
    deckId: string,
    format: GammaExportFormat = 'pdf'
  ): Promise<GammaExportResult> {
    const status = await this.waitForCompletion(deckId, 3, 180)
    if (!status.fileUrl) {
      throw new GammaError(
        `Generation ${deckId} has no file_url. Use exportFromContent(..., '${format}') instead.`
      )
    }

    const downloadResponse = await fetch(status.fileUrl, {
      signal: AbortSignal.timeout(GAMMA_TIMEOUT),
    })
    if (!downloadResponse.ok) {
      throw new GammaError('Failed to download export file')
    }

    return {
      url: status.fileUrl,
      format,
      buffer: Buffer.from(await downloadResponse.arrayBuffer()),
    }
  }

  /**
   * Legacy compatibility wrapper.
   */
  async getDeckStatus(deckId: string): Promise<DeckStatus> {
    const status = await this.getGenerationStatus(deckId)
    const normalized = status.status.toLowerCase()

    if (isCompletedStatus(normalized)) {
      return { status: 'ready', ready: true }
    }
    if (isFailedStatus(normalized)) {
      return { status: 'failed', ready: false }
    }
    return { status: 'processing', ready: false }
  }

  /**
   * Legacy compatibility wrapper.
   */
  async waitForDeckReady(deckId: string, maxWaitMs: number = 120000): Promise<void> {
    await this.waitForCompletion(deckId, 2, Math.ceil(maxWaitMs / 1000))
  }

  private convertContentToInputText(options: CreateDeckOptions): string {
    const sections: string[] = []
    sections.push(`# ${options.title}`)

    if (options.description) {
      sections.push(options.description)
    }

    options.content.forEach((slide, index) => {
      sections.push(`\n## ${slide.title || `第${index + 1}部分`}`)
      sections.push(slide.content)
      ;(slide.bullets || []).forEach((bullet) => {
        sections.push(`- ${bullet}`)
      })
      if (slide.image) {
        sections.push(`(Image reference: ${slide.image})`)
      }
    })

    return sections.join('\n')
  }

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
          if (!error.retryable) {
            throw error
          }
          if (
            error.statusCode &&
            error.statusCode >= 400 &&
            error.statusCode < 500 &&
            error.statusCode !== 429
          ) {
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Default Gamma client instance.
 */
export const gammaClient = new GammaClient()
