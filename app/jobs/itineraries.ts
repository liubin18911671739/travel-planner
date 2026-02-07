import { inngest } from '@/lib/queue/client'
import { jobRepository } from '@/lib/jobs/repository'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { GammaClient, type GammaSlideContent } from '@/lib/gamma/client'
import { createRAGRetrieval } from '@/lib/rag/retrieval'
import {
  createEmbeddingsProvider,
  type EmbeddingProviderType,
} from '@/lib/embeddings/stub'
import { uploadFile } from '@/lib/storage/helper'
import { createLLMProviderFromEnv } from '@/lib/llm'
import type { Json } from '@/lib/db/types'
import {
  buildItineraryPrompt,
  extractJSONFromResponse,
  isValidItineraryContent,
  type ItineraryContent,
  type ItineraryPromptInput,
} from '@/lib/llm/prompts'

const EMBEDDING_PROVIDER_TYPE = (
  process.env.EMBEDDING_PROVIDER || 'stub'
) as EmbeddingProviderType

function normalizeItinerarySettings(
  value: unknown
): ItineraryPromptInput['settings'] | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const settings = value as Record<string, unknown>
  const themes = Array.isArray(settings.themes)
    ? settings.themes.filter((item): item is string => typeof item === 'string')
    : undefined
  const difficulty =
    typeof settings.difficulty === 'string' ? settings.difficulty : undefined
  const budget = typeof settings.budget === 'string' ? settings.budget : undefined

  if (!themes && !difficulty && !budget) {
    return undefined
  }

  return {
    themes,
    difficulty,
    budget,
  }
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

/**
 * LLM call for itinerary generation using Zhipu AI (智谱清言).
 *
 * Integrates with RAG-retrieved knowledge to generate personalized study travel itineraries.
 */
async function generateItineraryContent(
  destination: string,
  durationDays: number,
  knowledgeContext: string,
  settings?: ItineraryPromptInput['settings']
): Promise<ItineraryContent> {
  // Create LLM provider using environment configuration
  const llm = createLLMProviderFromEnv()

  // Build prompt using template
  const promptInput: ItineraryPromptInput = {
    destination,
    durationDays,
    knowledgeContext,
    settings,
  }

  const messages = buildItineraryPrompt(promptInput)

  // Call LLM
  const response = await llm.chat(messages, {
    temperature: 0.7,
    top_p: 0.9,
  })

  // Extract and parse JSON response
  let parsedContent: unknown

  try {
    // Extract JSON from response (handles markdown code blocks)
    const jsonContent = extractJSONFromResponse(response.content)
    parsedContent = JSON.parse(jsonContent)
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : String(error)}\n` +
      `Response content: ${response.content.slice(0, 500)}...`
    )
  }

  // Validate response structure
  if (!isValidItineraryContent(parsedContent)) {
    throw new Error(
      'Invalid LLM response: missing or invalid itinerary structure'
    )
  }

  return parsedContent
}

/**
 * Convert itinerary content to Gamma slides format.
 */
function convertItineraryToSlides(content: ItineraryContent): GammaSlideContent[] {
  const slides: GammaSlideContent[] = []

  // Title slide
  slides.push({
    title: content.destination || '研学行程',
    content: `${content.durationDays}日深度研学体验`,
  })

  // Day slides
  content.days?.forEach((day) => {
    slides.push({
      title: day.title,
      content: day.description,
      bullets: day.activities?.map(
        (activity) => `${activity.time}: ${activity.activity} (${activity.location})`
      ) || [],
    })
  })

  return slides
}

/**
 * Inngest function: Generate an itinerary.
 *
 * Event: itineraries/generate
 * Data: { jobId, itineraryId, userId, destination, durationDays, knowledgePackIds, settings }
 */
export const generateItinerary = inngest.createFunction(
  { id: 'generate-itinerary' },
  { event: 'itineraries/generate' },
  async ({ event, step }) => {
    const {
      jobId,
      itineraryId,
      userId,
      destination,
      durationDays,
      knowledgePackIds,
      settings,
    } = event.data

    // Step 1: Initialize
    await step.run('initialize', async () => {
      await jobRepository.updateStatus(jobId, 'running', 10)
      await jobRepository.logInfo(jobId, '开始生成行程...')
    })

    // Step 2: Retrieve relevant knowledge using RAG
    const { knowledgeContext } = await step.run('retrieve-knowledge', async () => {
      await jobRepository.updateStatus(jobId, 'running', 30)
      await jobRepository.logInfo(jobId, '检索相关知识库内容...')

      if (knowledgePackIds.length === 0) {
        return { knowledgeContext: '' }
      }

      const embeddingsProvider = createEmbeddingsProvider(
        EMBEDDING_PROVIDER_TYPE
      )
      const rag = createRAGRetrieval(embeddingsProvider)
      const context = await rag.retrieveAsContext(destination, knowledgePackIds, {
        k: 10,
        threshold: 0.3,
      })

      return { knowledgeContext: context }
    })

    // Step 3: Generate itinerary content using LLM
    const { itineraryContent } = await step.run('generate-content', async () => {
      await jobRepository.updateStatus(jobId, 'running', 60)
      await jobRepository.logInfo(jobId, 'AI 正在生成行程内容...')

      const content = await generateItineraryContent(
        destination,
        durationDays,
        knowledgeContext,
        normalizeItinerarySettings(settings)
      )

      // Store content in database
      const contentJson = toJson(content)
      await supabaseAdmin
        .from('itineraries')
        .update({ content: contentJson })
        .eq('id', itineraryId)

      return { itineraryContent: content }
    })

    // Step 4: Create Gamma presentation
    const { gammaResult } = await step.run('create-gamma-deck', async () => {
      await jobRepository.updateStatus(jobId, 'running', 80)
      await jobRepository.logInfo(jobId, '创建演示文稿...')

      const gamma = new GammaClient()

      // Convert content to slides
      const slides = convertItineraryToSlides({
        destination,
        durationDays,
        days: itineraryContent.days,
      })

      const deck = await gamma.createDeck({
        title: `${destination} ${durationDays}日研学行程`,
        description: `为期${durationDays}天的${destination}深度研学体验`,
        content: slides,
      })

      // Update itinerary with Gamma info
      await supabaseAdmin
        .from('itineraries')
        .update({
          gamma_deck_id: deck.deckId,
          gamma_deck_url: deck.deckUrl,
        })
        .eq('id', itineraryId)

      return { gammaResult: deck }
    })

    // Step 5: Export PDF and PPTX, persist to Storage with artifacts table
    const { artifacts } = await step.run('persist-exports', async () => {
      await jobRepository.updateStatus(jobId, 'running', 90)
      await jobRepository.logInfo(jobId, '导出 PDF 和 PPTX...')

      const gamma = new GammaClient()
      const slides = convertItineraryToSlides({
        destination,
        durationDays,
        days: itineraryContent.days,
      })
      const deckOptions = {
        title: `${destination} ${durationDays}日研学行程`,
        description: `为期${durationDays}天的${destination}深度研学体验`,
        content: slides,
      }

      // Export PDF
      await jobRepository.logInfo(jobId, '正在导出 PDF...')
      const pdfData = await gamma.exportFromContent(deckOptions, 'pdf')
      const pdfPath = `itineraries/${itineraryId}.pdf`
      await uploadFile('EXPORTS', pdfPath, pdfData.buffer, 'application/pdf')

      // Export PPTX
      await jobRepository.logInfo(jobId, '正在导出 PPTX...')
      const pptxData = await gamma.exportFromContent(deckOptions, 'pptx')
      const pptxPath = `itineraries/${itineraryId}.pptx`
      await uploadFile(
        'EXPORTS',
        pptxPath,
        pptxData.buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )

      // Store artifacts in database (uses UPSERT for idempotency)
      const artifactRecords = [
        {
          itinerary_id: itineraryId,
          kind: 'pdf',
          storage_path: pdfPath,
          storage_bucket: 'EXPORTS',
          file_size: pdfData.buffer.length,
          metadata: { format: 'pdf', mime_type: 'application/pdf' },
        },
        {
          itinerary_id: itineraryId,
          kind: 'pptx',
          storage_path: pptxPath,
          storage_bucket: 'EXPORTS',
          file_size: pptxData.buffer.length,
          metadata: { format: 'pptx', mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
        },
      ]

      // Upsert artifacts (handles retries safely)
      await supabaseAdmin
        .from('artifacts')
        .upsert(artifactRecords, { onConflict: 'itinerary_id,kind' })

      return { artifacts: artifactRecords }
    })

    // Step 6: Finalize
    await step.run('finalize', async () => {
      await supabaseAdmin
        .from('itineraries')
        .update({ status: 'ready' })
        .eq('id', itineraryId)

      await jobRepository.logInfo(jobId, '行程生成完成！')
      await jobRepository.updateStatus(jobId, 'done', 100, {
        itineraryId,
        gammaDeckUrl: gammaResult.deckUrl,
        artifacts: artifacts.map(a => ({ kind: a.kind, storage_path: a.storage_path })),
      })
    })

    return {
      itineraryId,
      gammaDeckUrl: gammaResult.deckUrl,
      artifacts,
    }
  }
)
