/**
 * Prompt Templates
 *
 * Pre-defined prompt templates for various LLM use cases.
 * Currently focused on itinerary generation for study travel planning.
 */

import type { ChatMessage } from './provider'

/**
 * Itinerary generation input parameters.
 */
export interface ItineraryPromptInput {
  destination: string
  durationDays: number
  knowledgeContext: string
  settings?: {
    themes?: string[]
    difficulty?: string
    budget?: string
  }
}

/**
 * Generated itinerary content structure.
 */
export interface ItineraryContent {
  destination: string
  durationDays: number
  days: ItineraryDay[]
}

export interface ItineraryDay {
  day: number
  title: string
  description: string
  location: string
  activities: ItineraryActivity[]
}

export interface ItineraryActivity {
  time: string
  activity: string
  location: string
  description?: string
  duration: string
}

/**
 * Build the system prompt for itinerary generation.
 */
function buildSystemPrompt(): string {
  return `你是一位专业的研学旅行规划师。你的任务是根据用户提供的目的地和知识库内容，生成详细的研学行程。

行程设计要求：
1. 每天行程应包含具体的时间、活动、地点
2. 活动应具有教育意义和研学价值，结合文化、历史、自然等元素
3. 时间安排要合理，避免过于紧张或松散
4. 考虑学生的体力和兴趣，安排适当的休息时间
5. 每个活动都应有明确的研学目标和收获

输出格式要求：
- 必须返回有效的 JSON 格式
- 不要包含任何其他文字说明
- JSON 结构必须符合以下规范：
{
  "destination": "目的地名称",
  "durationDays": 天数,
  "days": [
    {
      "day": 1,
      "title": "第1天主题（如：抵达与适应）",
      "description": "当日概述（1-2句话）",
      "location": "主要活动区域",
      "activities": [
        {
          "time": "09:00",
          "activity": "活动名称",
          "location": "具体地点",
          "description": "活动描述和研学目标",
          "duration": "预计时长（如：2小时）"
        }
      ]
    }
  ]
}`
}

/**
 * Build the user prompt for itinerary generation.
 */
function buildUserPrompt(input: ItineraryPromptInput): string {
  const { destination, durationDays, knowledgeContext, settings } = input

  let prompt = `请为${destination}设计一个${durationDays}日的研学行程。\n\n`

  // Add optional parameters
  const params: string[] = []

  if (settings?.themes && settings.themes.length > 0) {
    params.push(`- 研学主题：${settings.themes.join('、')}`)
  }

  if (settings?.difficulty) {
    params.push(`- 难度等级：${settings.difficulty}`)
  }

  if (settings?.budget) {
    params.push(`- 预算范围：${settings.budget}`)
  }

  if (params.length > 0) {
    prompt += params.join('\n') + '\n\n'
  }

  // Add knowledge context if available
  if (knowledgeContext && knowledgeContext.trim().length > 0) {
    prompt += `参考知识库内容：\n${knowledgeContext}\n\n`
  }

  prompt += `请严格按照要求的 JSON 格式返回行程规划，不要包含任何其他文字。`

  return prompt
}

/**
 * Build complete chat messages for itinerary generation.
 *
 * @param input - Itinerary generation parameters
 * @returns Array of chat messages [system, user]
 */
export function buildItineraryPrompt(input: ItineraryPromptInput): ChatMessage[] {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(),
    },
    {
      role: 'user',
      content: buildUserPrompt(input),
    },
  ]
}

/**
 * Extract JSON from LLM response.
 * Handles responses wrapped in markdown code blocks.
 *
 * @param content - Raw LLM response content
 * @returns Extracted JSON string
 */
export function extractJSONFromResponse(content: string): string {
  // Remove markdown code block markers if present
  let jsonContent = content

  // Remove ```json and ``` markers
  jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '')

  // Remove any remaining ``` markers
  jsonContent = jsonContent.replace(/```\n?/g, '')

  return jsonContent.trim()
}

/**
 * Validate that the parsed content has the required itinerary structure.
 *
 * @param parsed - Parsed JSON content
 * @returns True if valid, false otherwise
 */
export function isValidItineraryContent(
  parsed: unknown
): parsed is ItineraryContent {
  if (!parsed || typeof parsed !== 'object') {
    return false
  }

  const content = parsed as Record<string, unknown>

  // Check required top-level fields
  if (
    !content.destination ||
    typeof content.destination !== 'string' ||
    !content.durationDays ||
    typeof content.durationDays !== 'number'
  ) {
    return false
  }

  // Check days array
  if (!Array.isArray(content.days)) {
    return false
  }

  if (content.days.length === 0) {
    return false
  }

  // Validate each day
  for (const day of content.days) {
    if (!day || typeof day !== 'object') {
      return false
    }

    const dayObj = day as Record<string, unknown>

    if (
      typeof dayObj.day !== 'number' ||
      !dayObj.title ||
      typeof dayObj.title !== 'string' ||
      !Array.isArray(dayObj.activities)
    ) {
      return false
    }

    // Validate activities
    for (const activity of dayObj.activities) {
      if (!activity || typeof activity !== 'object') {
        return false
      }

      const act = activity as Record<string, unknown>

      if (
        !act.time ||
        typeof act.time !== 'string' ||
        !act.activity ||
        typeof act.activity !== 'string' ||
        !act.location ||
        typeof act.location !== 'string'
      ) {
        return false
      }
    }
  }

  return true
}
