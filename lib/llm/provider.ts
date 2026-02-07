/**
 * LLM Provider Interface
 *
 * Defines a unified interface for LLM providers (Zhipu, OpenAI, etc.).
 * Supports both chat completion and streaming responses.
 */

/**
 * Chat message role types.
 */
export type ChatRole = 'system' | 'user' | 'assistant'

/**
 * Chat message structure.
 */
export interface ChatMessage {
  role: ChatRole
  content: string
}

/**
 * Options for LLM chat completion.
 */
export interface ChatOptions {
  model?: string
  temperature?: number
  top_p?: number
  maxTokens?: number
  stream?: boolean
}

/**
 * LLM chat completion response.
 */
export interface ChatResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * LLM Provider interface.
 * All LLM implementations must implement this interface.
 */
export interface LLMProvider {
  /**
   * Send chat completion request.
   *
   * @param messages - Array of chat messages
   * @param options - Optional chat parameters
   * @returns Chat response with content and usage info
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>

  /**
   * Send streaming chat completion request.
   *
   * @param messages - Array of chat messages
   * @param options - Optional chat parameters
   * @returns Async iterable of response chunks
   */
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>
}

/**
 * Supported LLM provider types.
 */
export type LLMProviderType = 'zhipu' | 'openai' | 'stub'
