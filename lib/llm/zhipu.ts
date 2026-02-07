/**
 * Zhipu AI (智谱清言) LLM Provider
 *
 * Implements the LLM Provider interface for Zhipu AI's GLM models.
 * Supports GLM-4-Flash, GLM-4-Plus, and GLM-4 models.
 *
 * @see https://open.bigmodel.cn/dev/api
 */

import { ZhipuAI } from 'zhipuai'
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  LLMProvider,
} from './provider'

/**
 * Supported Zhipu AI model types.
 * Based on the official SDK types, these are the available models.
 */
export type ZhipuModel = 'glm-4' | 'glm-3-turbo'

/**
 * Zhipu AI provider configuration.
 */
export interface ZhipuConfig {
  apiKey?: string
  model?: ZhipuModel
}

/**
 * Model configuration presets.
 */
const MODEL_CONFIGS: Record<ZhipuModel, { maxTokens: number; description: string }> = {
  'glm-4': { maxTokens: 128000, description: 'Standard GLM-4' },
  'glm-3-turbo': { maxTokens: 128000, description: 'Fast, cost-effective' },
}

/**
 * Retry configuration for failed requests.
 */
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_DELAY_MS = 1000

type ZhipuUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

type ZhipuChoice = {
  message?: {
    content?: string
  }
  delta?: {
    content?: string
  }
}

type ZhipuChatResponse = {
  choices: ZhipuChoice[]
  model: string
  usage?: ZhipuUsage
}

type ZhipuStreamChunk = {
  choices: ZhipuChoice[]
}

type ChatPayload = {
  model: string
  temperature: number
  top_p: number
  max_tokens?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isZhipuChatResponse(value: unknown): value is ZhipuChatResponse {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    return false
  }
  return typeof value.model === 'string'
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return isRecord(value) && Symbol.asyncIterator in value
}

/**
 * Zhipu AI LLM Provider implementation.
 */
export class ZhipuProvider implements LLMProvider {
  private client: ZhipuAI | null
  private readonly model: ZhipuModel
  private readonly maxRetries: number
  private initialized = false

  constructor(config: ZhipuConfig = {}) {
    this.model = config.model || 'glm-4'
    this.maxRetries = DEFAULT_MAX_RETRIES
    this.client = null
  }

  /**
   * Ensure the client is initialized.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    const apiKey = process.env.ZHIPU_API_KEY
    if (!apiKey) {
      throw new Error(
        'Zhipu API key is required. Set ZHIPU_API_KEY environment variable.'
      )
    }

    this.client = new ZhipuAI({ apiKey })
    this.initialized = true
  }

  /**
   * Send a chat completion request to Zhipu AI.
   *
   * @param messages - Array of chat messages
   * @param options - Optional chat parameters
   * @returns Chat response with content and usage info
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    await this.ensureInitialized()

    const model = options?.model || this.model
    const temperature = options?.temperature ?? 0.7
    const topP = options?.top_p ?? 0.9
    const maxTokens = options?.maxTokens

    const response = await this.chatWithRetry(messages, {
      model,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
    })

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    }
  }

  /**
   * Send a streaming chat completion request to Zhipu AI.
   *
   * @param messages - Array of chat messages
   * @param options - Optional chat parameters
   * @returns Async iterable of response chunks
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<string> {
    await this.ensureInitialized()

    const model = options?.model || this.model
    const temperature = options?.temperature ?? 0.7
    const topP = options?.top_p ?? 0.9

    if (!this.client) {
      throw new Error('Zhipu client is not initialized')
    }

    const streamResult = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      top_p: topP,
      stream: true,
    })

    if (!isAsyncIterable(streamResult)) {
      throw new Error('Zhipu stream response is invalid')
    }

    for await (const chunk of streamResult as AsyncIterable<ZhipuStreamChunk>) {
      const content = chunk.choices?.[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }

  /**
   * Internal method to call chat API with retry logic.
   */
  private async chatWithRetry(
    messages: ChatMessage[],
    payload: ChatPayload,
    attempt: number = 1
  ): Promise<ZhipuChatResponse> {
    try {
      if (!this.client) {
        throw new Error('Zhipu client is not initialized')
      }

      const response = await this.client.chat.completions.create({
        ...payload,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      })

      if (!isZhipuChatResponse(response)) {
        throw new Error('Zhipu response payload is invalid')
      }

      return response
    } catch (error) {
      const isLastAttempt = attempt >= this.maxRetries

      // Check if error is retryable
      if (this.isRetryableError(error) && !isLastAttempt) {
        const delay = DEFAULT_RETRY_DELAY_MS * attempt
        await this.sleep(delay)
        return this.chatWithRetry(messages, payload, attempt + 1)
      }

      // Re-throw if not retryable or last attempt
      throw new Error(
        `Zhipu AI chat failed: ${error instanceof Error ? error.message : String(error)}`
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
  getModel(): ZhipuModel {
    return this.model
  }

  /**
   * Get the max tokens for the current model.
   */
  getMaxTokens(): number {
    return MODEL_CONFIGS[this.model].maxTokens
  }
}

/**
 * Factory function to create a Zhipu provider.
 *
 * @param config - Provider configuration
 * @returns Zhipu LLM provider instance
 */
export function createZhipuProvider(config?: ZhipuConfig): ZhipuProvider {
  return new ZhipuProvider(config)
}
