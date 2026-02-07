import { EmbeddingsProvider, Embedding, EmbeddingsProviderConfig } from './provider'

/**
 * Stub implementation of EmbeddingsProvider for development and testing.
 *
 * This implementation generates deterministic pseudo-random embeddings
 * based on the hash of the input text. This ensures that the same text
 * always produces the same embedding, allowing for consistent testing
 * without calling an external API.
 *
 * NOT SUITABLE FOR PRODUCTION USE - replace with OpenAI, Cohere, or similar.
 */
export class StubEmbeddingsProvider implements EmbeddingsProvider {
  private readonly dimension: number
  private readonly maxTokens: number

  constructor(config: EmbeddingsProviderConfig = {}) {
    this.dimension = config.dimension || 1536 // OpenAI default
    this.maxTokens = config.maxTokens || 8191
  }

  getDimension(): number {
    return this.dimension
  }

  getMaxTokens(): number {
    return this.maxTokens
  }

  async embed(text: string): Promise<Embedding> {
    // Generate deterministic vector from text hash
    const seed = this.hashString(text)
    const vector = this.seededRandom(seed, this.dimension)

    return { vector, dimension: this.dimension }
  }

  async embedBatch(texts: string[]): Promise<Embedding[]> {
    return Promise.all(texts.map((text) => this.embed(text)))
  }

  /**
   * Simple string hash for deterministic seeding.
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Generate deterministic pseudo-random numbers from a seed.
   * Uses a simple linear congruential generator.
   */
  private seededRandom(seed: number, count: number): number[] {
    const result: number[] = []
    let state = seed

    // LCG parameters (from Numerical Recipes)
    const a = 1664525
    const c = 1013904223
    const m = Math.pow(2, 32)

    for (let i = 0; i < count; i++) {
      state = (a * state + c) % m
      // Map to [-1, 1] range (typical for normalized embeddings)
      result.push((state / m) * 2 - 1)
    }

    return result
  }
}

/**
 * Factory function to create an embeddings provider.
 * In production, this would switch based on configuration.
 *
 * @param type - Provider type ('stub', 'openai', 'cohere', etc.)
 * @param config - Provider configuration
 */
export function createEmbeddingsProvider(
  type: 'stub' | 'openai' | 'cohere' = 'stub',
  config?: EmbeddingsProviderConfig
): EmbeddingsProvider {
  switch (type) {
    case 'stub':
      return new StubEmbeddingsProvider(config)
    // Future: add OpenAI, Cohere, etc.
    default:
      return new StubEmbeddingsProvider(config)
  }
}

/**
 * Default embeddings provider instance (stub for development).
 */
export const defaultEmbeddingsProvider = new StubEmbeddingsProvider()
