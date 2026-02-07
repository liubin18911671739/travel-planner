import { inngest } from '@/lib/queue/client'
import { jobRepository } from '@/lib/jobs/repository'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { GammaClient } from '@/lib/gamma/client'
import { createRAGRetrieval } from '@/lib/rag/retrieval'
import { createEmbeddingsProvider } from '@/lib/embeddings/stub'
import { uploadFile } from '@/lib/storage/helper'
import { BUCKETS } from '@/lib/storage/buckets'

/**
 * LLM call for itinerary generation.
 * In production, integrate with OpenAI, Anthropic, or similar.
 */
async function generateItineraryContent(
  destination: string,
  durationDays: number,
  knowledgeContext: string
): Promise<any> {
  // Stub implementation - replace with actual LLM call
  // In production:
  // const openai = new OpenAI()
  // const response = await openai.chat.completions.create({...})

  return {
    days: Array.from({ length: durationDays }, (_, i) => ({
      day: i + 1,
      title: `第${i + 1}天：${destination}探索`,
      description: `探索${destination}的精彩内容...`,
      location: destination,
      duration: '8小时',
      activities: [
        { time: '09:00', activity: '早餐', location: '酒店' },
        { time: '10:00', activity: '参观景点', location: `${destination}景区` },
        { time: '12:00', activity: '午餐', location: '当地餐厅' },
        { time: '14:00', activity: '文化活动', location: '文化中心' },
        { time: '18:00', activity: '晚餐', location: '特色餐厅' },
      ],
    })),
  }
}

/**
 * Convert itinerary content to Gamma slides format.
 */
function convertItineraryToSlides(content: any): any[] {
  const slides: any[] = []

  // Title slide
  slides.push({
    type: 'title',
    title: content.destination || '研学行程',
    subtitle: `${content.durationDays}日深度研学体验`,
  })

  // Day slides
  content.days?.forEach((day: any) => {
    slides.push({
      type: 'section',
      title: day.title,
    })

    slides.push({
      type: 'content',
      title: day.description,
      bullets: day.activities?.map((a: any) => `${a.time}: ${a.activity} (${a.location})`) || [],
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
      await jobRepository.updateStatus(jobId, 'running', 5)
      await jobRepository.logInfo(jobId, '开始生成行程...')
    })

    // Step 2: Retrieve relevant knowledge using RAG
    const { knowledgeContext } = await step.run('retrieve-knowledge', async () => {
      await jobRepository.updateStatus(jobId, 'running', 10)
      await jobRepository.logInfo(jobId, '检索相关知识库内容...')

      if (knowledgePackIds.length === 0) {
        return { knowledgeContext: '' }
      }

      const embeddingsProvider = createEmbeddingsProvider('stub')
      const rag = createRAGRetrieval(embeddingsProvider)
      const context = await rag.retrieveAsContext(destination, knowledgePackIds, {
        k: 10,
        threshold: 0.3,
      })

      return { knowledgeContext: context }
    })

    // Step 3: Generate itinerary content using LLM
    const { itineraryContent } = await step.run('generate-content', async () => {
      await jobRepository.updateStatus(jobId, 'running', 30)
      await jobRepository.logInfo(jobId, 'AI 正在生成行程内容...')

      const content = await generateItineraryContent(
        destination,
        durationDays,
        knowledgeContext
      )

      // Store content in database
      await supabaseAdmin
        .from('itineraries')
        .update({ content })
        .eq('id', itineraryId)

      return { itineraryContent: content }
    })

    // Step 4: Create Gamma presentation
    const { gammaResult } = await step.run('create-gamma-deck', async () => {
      await jobRepository.updateStatus(jobId, 'running', 50)
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

    // Step 5: Export and persist to Storage
    const { exportPath } = await step.run('persist-export', async () => {
      await jobRepository.updateStatus(jobId, 'running', 70)
      await jobRepository.logInfo(jobId, '导出并保存文件...')

      const gamma = new GammaClient()
      const exportData = await gamma.exportDeck(gammaResult.deckId, 'pdf')

      // Upload to Storage
      const path = `itineraries/${itineraryId}.pdf`
      await uploadFile('EXPORTS', path, exportData.buffer, 'application/pdf')

      // Update itinerary with export path
      await supabaseAdmin
        .from('itineraries')
        .update({ export_url: path })
        .eq('id', itineraryId)

      return { exportPath: path }
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
        exportPath,
      })
    })

    return {
      itineraryId,
      gammaDeckUrl: gammaResult.deckUrl,
      exportPath,
    }
  }
)
