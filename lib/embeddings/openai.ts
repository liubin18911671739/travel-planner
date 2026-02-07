/**
 * OpenAI Embeddings Provider
 *
 * Production-ready implementation using OpenAI's embedding API.
 * Requires: npm install openai
 *
 * Supports:
 * - text-embedding-3-small (1536 dimensions, cheaper)
 * - text-embedding-3-large (3072 dimensions, higher quality)
 * - text-embedding-ada-002 (legacy, 1536 dimensions)
 *
 * IMPORTANT: This module requires the 'openai' package.
 * Install with: npm install openai
 */

import type {
  Embedding,
  EmbeddingsProvider,
  EmbeddingsProviderConfig,
} from './provider'

type OpenAIEmbeddingsCreateResponse = {
  data: Array<{ embedding: number[] }>
}

type OpenAIClientLike = {
  embeddings: {
    create: (params: {
      model: OpenAIEmbeddingModel
      input: string[]
      dimensions: number
      encoding_format: 'float'
    }) => Promise<OpenAIEmbeddingsCreateResponse>
  }
}

type OpenAIConstructorLike = new (params: { apiKey: string }) => OpenAIClientLike

function isOpenAIConstructorLike(value: unknown): value is OpenAIConstructorLike {
  return typeof value === 'function'
}

// Dynamic import to avoid build errors when package is not installed
let OpenAI: OpenAIConstructorLike | null = null

async function loadOpenAI() {
  if (!OpenAI) {
    try {
      // Use runtime dynamic import to avoid bundler resolving optional dependency at build time.
      const dynamicImport = new Function(
        'specifier',
        'return import(specifier)'
      ) as (specifier: string) => Promise<{ default: unknown }>
      const openaiModule = await dynamicImport('openai')
      if (!isOpenAIConstructorLike(openaiModule.default)) {
        throw new Error('Invalid OpenAI module export')
      }
      OpenAI = openaiModule.default
    } catch {
      throw new Error(
        'OpenAI package is not installed. Install it with: npm install openai'
      )
    }
  }
  return OpenAI
}

export type OpenAIEmbeddingModel =
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'text-embedding-ada-002'

export interface OpenAIEmbeddingsConfig extends EmbeddingsProviderConfig {
  apiKey?: string
  model?: OpenAIEmbeddingModel
  baseURL?: string
}

/**
 * Model configurations with dimensions and pricing info.
 */
const MODEL_CONFIGS: Record<
  OpenAIEmbeddingModel,
  { dimension: number; maxTokens: number }
> = {
  'text-embedding-3-small': { dimension: 1536, maxTokens: 8191 },
  'text-embedding-3-large': { dimension: 3072, maxTokens: 8191 },
  'text-embedding-ada-002': { dimension: 1536, maxTokens: 8191 },
}

/**
 * Default batch size for OpenAI embedding requests.
 * OpenAI supports up to 2048 texts per request for embedding models.
 */
const DEFAULT_BATCH_SIZE = 100

/**
 * Retry configuration for failed requests.
 */
const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 1000

/**
 * OpenAI Embeddings Provider Implementation.
 */
export class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  private client: OpenAIClientLike | null
  private readonly model: OpenAIEmbeddingModel
  private readonly dimension: number
  private readonly maxTokens: number
  private readonly batchSize: number
  private readonly retryAttempts: number
  private initialized = false

  constructor(config: OpenAIEmbeddingsConfig = {}) {
    this.model = config.model || 'text-embedding-3-small'
    const modelConfig = MODEL_CONFIGS[this.model]

    this.dimension = config.dimension || modelConfig.dimension
    this.maxTokens = config.maxTokens || modelConfig.maxTokens
    this.batchSize = config.batchSize || DEFAULT_BATCH_SIZE
    this.retryAttempts = config.retryAttempts || DEFAULT_RETRY_ATTEMPTS

    // Defer initialization to first use
    this.client = null
  }

  private async ensureInitialized() {
    if (this.initialized) return

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        'OpenAI API key is required. Set OPENAI_API_KEY environment variable.'
      )
    }

    const OpenAIClass = await loadOpenAI()
    this.client = new OpenAIClass({
      apiKey,
    })
    this.initialized = true
  }

  getDimension(): number {
    return this.dimension
  }

  getMaxTokens(): number {
    return this.maxTokens
  }

  /**
   * Generate embedding for a single text.
   */
  async embed(text: string): Promise<Embedding> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  /**
   * Generate embeddings for multiple texts in batches.
   *
   * Automatically handles rate limiting and retries.
   */
  async embedBatch(texts: string[]): Promise<Embedding[]> {
    await this.ensureInitialized()

    if (texts.length === 0) {
      return []
    }

    const allEmbeddings: Embedding[] = []

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize)
      const embeddings = await this.embedBatchWithRetry(batch)
      allEmbeddings.push(...embeddings)
    }

    return allEmbeddings
  }

  /**
   * Process a single batch with retry logic.
   */
  private async embedBatchWithRetry(
    texts: string[],
    attempt: number = 1
  ): Promise<Embedding[]> {
    try {
      if (!this.client) {
        throw new Error('OpenAI client is not initialized')
      }

      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimension,
        encoding_format: 'float',
      })

      return response.data.map((item) => ({
        vector: item.embedding,
        dimension: this.dimension,
      }))
    } catch (error) {
      const isLastAttempt = attempt >= this.retryAttempts

      // Check if error is retryable
      if (this.isRetryableError(error) && !isLastAttempt) {
        const delay = DEFAULT_RETRY_DELAY_MS * attempt
        await this.sleep(delay)
        return this.embedBatchWithRetry(texts, attempt + 1)
      }

      // Re-throw if not retryable or last attempt
      throw new Error(
        `OpenAI embedding failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Determine if an error is retryable.
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      // Rate limit errors
      if (message.includes('rate limit') || message.includes('429')) {
        return true
      }

      // Temporary server errors
      if (message.includes('timeout') || message.includes('503') || message.includes('502')) {
        return true
      }

      // Connection errors
      if (message.includes('econnreset') || message.includes('enotfound')) {
        return true
      }
    }

    return false
  }

  /**
   * Sleep for a specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get the model being used.
   */
  getModel(): OpenAIEmbeddingModel {
    return this.model
  }

  /**
   * Get the batch size.
   */
  getBatchSize(): number {
    return this.batchSize
  }
}

/**
 * Factory function to create an OpenAI embeddings provider.
 *
 * @param config - Provider configuration
 * @returns OpenAI embeddings provider instance
 */
export async function createOpenAIEmbeddingsProvider(
  config?: OpenAIEmbeddingsConfig
): Promise<OpenAIEmbeddingsProvider> {
  return new OpenAIEmbeddingsProvider(config)
}

/**
 * Synchronous factory for use in existing code.
 * Note: The provider will initialize lazily on first use.
 */
export function createOpenAIEmbeddingsProviderSync(
  config?: OpenAIEmbeddingsConfig
): OpenAIEmbeddingsProvider {
  return new OpenAIEmbeddingsProvider(config)
}
