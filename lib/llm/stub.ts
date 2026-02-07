/**
 * Stub LLM Provider
 *
 * Development-only implementation that returns predictable responses
 * based on input. Useful for testing without API calls.
 */

import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  LLMProvider,
} from './provider'

/**
 * Stub LLM Provider for development and testing.
 */
export class StubLLMProvider implements LLMProvider {
  private readonly responsePrefix: string

  constructor(responsePrefix: string = '[Stub LLM]') {
    this.responsePrefix = responsePrefix
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    // Get the last user message for context
    const userMessages = messages.filter((m) => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]
    const context = lastUserMessage
      ? lastUserMessage.content.slice(0, 100)
      : 'no input'

    // Generate a pseudo-response
    const response = this.generateStubResponse(context)

    return {
      content: response,
      model: 'stub-model',
      usage: {
        promptTokens: context.length,
        completionTokens: response.length,
        totalTokens: context.length + response.length,
      },
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<string> {
    const response = await this.chat(messages, options)
    const chunks = response.content.split('')

    for (const chunk of chunks) {
      yield chunk
      // Simulate network delay for streaming
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  /**
   * Generate a predictable stub response based on input context.
   */
  private generateStubResponse(context: string): string {
    // Check if the context mentions itinerary planning
    if (
      context.includes('行程') ||
      context.includes('研学') ||
      context.includes('旅行') ||
      context.toLowerCase().includes('itinerary')
    ) {
      return JSON.stringify(
        {
          destination: '示例目的地',
          durationDays: 3,
          days: [
            {
              day: 1,
              title: '第1天：抵达与适应',
              description: '抵达目的地，酒店入住，周边熟悉',
              location: '市中心',
              activities: [
                { time: '10:00', activity: '抵达', location: '机场/车站', duration: '1小时' },
                { time: '14:00', activity: '酒店入住', location: '酒店', duration: '0.5小时' },
                { time: '15:00', activity: '周边探索', location: '市中心', duration: '3小时' },
                { time: '18:00', activity: '晚餐', location: '当地餐厅', duration: '1.5小时' },
              ],
            },
            {
              day: 2,
              title: '第2天：深度探索',
              description: '主要景点参观，文化体验活动',
              location: '景区',
              activities: [
                { time: '09:00', activity: '早餐', location: '酒店', duration: '1小时' },
                { time: '10:00', activity: '景点参观', location: '主要景点', duration: '3小时' },
                { time: '13:00', activity: '午餐', location: '景区餐厅', duration: '1小时' },
                { time: '15:00', activity: '文化活动', location: '文化中心', duration: '2小时' },
                { time: '18:00', activity: '晚餐', location: '特色餐厅', duration: '1.5小时' },
              ],
            },
            {
              day: 3,
              title: '第3天：总结与返程',
              description: '纪念品购买，总结分享，返程',
              location: '市区',
              activities: [
                { time: '09:00', activity: '早餐', location: '酒店', duration: '1小时' },
                { time: '10:00', activity: '纪念品购买', location: '商业街', duration: '2小时' },
                { time: '13:00', activity: '总结分享会', location: '会议中心', duration: '2小时' },
                { time: '16:00', activity: '前往机场/车站', location: '交通枢纽', duration: '1小时' },
              ],
            },
          ],
        },
        null,
        2
      )
    }

    // Default stub response
    return `${this.responsePrefix} 收到请求: "${context}"\n\n这是一个存根响应。请配置实际的 LLM Provider (zhipu) 来获得真实的 AI 生成内容。`
  }
}
