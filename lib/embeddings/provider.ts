/**
 * Embeddings Provider Interface
 *
 * This interface defines the contract for generating text embeddings.
 * Implementations can use OpenAI, Cohere, or other embedding services.
 */

export interface Embedding {
  vector: number[]
  dimension: number
}

export interface EmbeddingsProvider {
  /**
   * Generate embedding for a single text.
   *
   * @param text - Input text to embed
   * @returns Embedding vector with dimension
   */
  embed(text: string): Promise<Embedding>

  /**
   * Generate embeddings for multiple texts (batch).
   * More efficient than calling embed() multiple times.
   *
   * @param texts - Array of input texts
   * @returns Array of embeddings
   */
  embedBatch(texts: string[]): Promise<Embedding[]>

  /**
   * Get the dimension of embeddings produced by this provider.
   */
  getDimension(): number

  /**
   * Get the maximum number of tokens that can be embedded in a single request.
   */
  getMaxTokens?(): number
}

/**
 * Embedding provider configuration options.
 */
export interface EmbeddingsProviderConfig {
  dimension?: number
  maxTokens?: number
  batchSize?: number
  retryAttempts?: number
  timeout?: number
}
