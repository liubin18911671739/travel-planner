/**
 * LLM Provider Module
 *
 * Unified export for all LLM provider implementations.
 *
 * Usage:
 * ```ts
 * import { createLLMProvider } from '@/lib/llm'
 *
 * const llm = createLLMProvider('zhipu')
 * const response = await llm.chat([
 *   { role: 'user', content: 'Hello!' }
 * ])
 * ```
 */

// Re-export types
export type {
  ChatRole,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  LLMProvider,
  LLMProviderType,
} from './provider'

// Re-export providers
export { StubLLMProvider } from './stub'
export { ZhipuProvider, createZhipuProvider, type ZhipuConfig, type ZhipuModel } from './zhipu'

// Re-export prompts
export {
  buildItineraryPrompt,
  extractJSONFromResponse,
  isValidItineraryContent,
  type ItineraryPromptInput,
  type ItineraryContent,
  type ItineraryDay,
  type ItineraryActivity,
} from './prompts'

// Provider imports for factory function
import { StubLLMProvider } from './stub'
import { ZhipuProvider } from './zhipu'
import type { LLMProvider, LLMProviderType } from './provider'

/**
 * Factory function to create an LLM provider.
 *
 * @param type - Provider type ('zhipu' | 'stub')
 * @param config - Optional provider-specific configuration
 * @returns LLM provider instance
 *
 * @example
 * ```ts
 * // Use Zhipu AI (requires ZHIPU_API_KEY env var)
 * const zhipu = createLLMProvider('zhipu', { model: 'glm-4-flash' })
 *
 * // Use stub for development
 * const stub = createLLMProvider('stub')
 * ```
 */
export function createLLMProvider(
  type: LLMProviderType = 'stub',
  config?: Record<string, unknown>
): LLMProvider {
  switch (type) {
    case 'zhipu':
      return new ZhipuProvider(config as any)
    case 'stub':
      return new StubLLMProvider()
    default:
      throw new Error(`Unknown LLM provider: ${type}`)
  }
}

/**
 * Get the default LLM provider type from environment.
 * Falls back to 'stub' if not configured.
 *
 * @returns Provider type from env or 'stub'
 */
export function getDefaultLLMProviderType(): LLMProviderType {
  return (process.env.LLM_PROVIDER as LLMProviderType) || 'stub'
}

/**
 * Create LLM provider using environment configuration.
 * Shortcut for createLLMProvider(getDefaultLLMProviderType()).
 *
 * @returns LLM provider instance
 */
export function createLLMProviderFromEnv(): LLMProvider {
  return createLLMProvider(getDefaultLLMProviderType())
}
