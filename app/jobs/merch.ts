import { inngest } from '@/lib/queue/client'
import { jobRepository } from '@/lib/jobs/repository'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ComfyClient } from '@/lib/comfy/client'
import { getSignedUrl, uploadFile } from '@/lib/storage/helper'
import { DEFAULT_SIGNED_URL_EXPIRES_IN } from '@/lib/storage/buckets'
import type { ItineraryContext } from '@/lib/merch/adapters'
import type { ArtifactRow, ItineraryRow } from '@/lib/db/types'

type ViewType = 'front' | 'side' | 'back' | 'context'

type ItineraryContextRow = Pick<
  ItineraryRow,
  'destination' | 'content' | 'settings'
>

type SerializedBuffer = { type: 'Buffer'; data: number[] }
type ArtifactUpsertRow = Pick<ArtifactRow, 'id' | 'kind' | 'storage_path'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toSettingsRecord(
  value: unknown
): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function toBuffer(value: Buffer | SerializedBuffer): Buffer {
  if (Buffer.isBuffer(value)) {
    return value
  }

  if (value.type === 'Buffer' && Array.isArray(value.data)) {
    return Buffer.from(value.data)
  }

  throw new Error('Invalid image buffer payload')
}

/**
 * Extract highlights from itinerary content for themed pattern generation.
 */
function extractItineraryHighlights(content: unknown): string[] {
  const highlights: string[] = []

  if (!isRecord(content)) return highlights

  // Extract from days
  const days = Array.isArray(content.days) ? content.days : []
  if (days.length > 0) {
    for (const day of days) {
      if (!isRecord(day)) {
        continue
      }

      // Extract locations
      if (typeof day.location === 'string' && day.location.length > 0) {
        highlights.push(day.location)
      }
      // Extract activity themes
      const activities = Array.isArray(day.activities) ? day.activities : []
      if (activities.length > 0) {
        for (const activity of activities) {
          if (!isRecord(activity)) {
            continue
          }

          const act =
            typeof activity.activity === 'string'
              ? activity.activity.toLowerCase()
              : ''
          if (act.includes('museum') || act.includes('博物馆')) {
            highlights.push('museum')
          }
          if (act.includes('park') || act.includes('公园') || act.includes('nature')) {
            highlights.push('nature')
          }
          if (act.includes('temple') || act.includes('寺庙') || act.includes('history')) {
            highlights.push('history')
          }
          if (act.includes('art') || act.includes('艺术')) {
            highlights.push('art')
          }
        }
      }
    }
  }

  return [...new Set(highlights)] // Deduplicate
}

/**
 * Inngest function: Generate merchandise design.
 *
 * Event: merch/generate
 * Data: { jobId, designId, userId, productType, themeKeywords, colorMood, density, styleLock, itineraryId? }
 */
export const generateMerch = inngest.createFunction(
  { id: 'generate-merch' },
  { event: 'merch/generate' },
  async ({ event, step }) => {
    const {
      jobId,
      designId,
      userId,
      productType,
      themeKeywords,
      colorMood,
      density,
      styleLock,
      itineraryId,
    } = event.data

    // Step 1: Initialize
    await step.run('initialize', async () => {
      await jobRepository.updateStatus(jobId, 'running', 5)
      await jobRepository.logInfo(jobId, '开始生成商品设计...')
    })

    // Step 1.5: Fetch itinerary context (if provided)
    const { itineraryContext } = await step.run('fetch-itinerary-context', async () => {
      if (!itineraryId) {
        return { itineraryContext: null }
      }

      await jobRepository.logInfo(jobId, `获取行程上下文: ${itineraryId}`)

      const { data: itinerary } = await supabaseAdmin
        .from('itineraries')
        .select('destination, content, settings')
        .eq('id', itineraryId)
        .single()

      if (!itinerary || typeof itinerary.destination !== 'string') {
        await jobRepository.logWarning(jobId, '未找到行程，使用默认主题')
        return { itineraryContext: null }
      }

      const typedItinerary: ItineraryContextRow = {
        destination: itinerary.destination,
        content: itinerary.content,
        settings: itinerary.settings,
      }

      const settingsRecord = toSettingsRecord(typedItinerary.settings)
      const highlights = extractItineraryHighlights(typedItinerary.content)
      const themesRaw = settingsRecord?.themes
      const themes = Array.isArray(themesRaw)
        ? themesRaw.filter((item): item is string => typeof item === 'string')
        : undefined

      const context: ItineraryContext = {
        destination: typedItinerary.destination,
        highlights,
        themes,
        settings: settingsRecord,
      }

      await jobRepository.logInfo(
        jobId,
        `行程上下文: ${context.destination}, 亮点: ${highlights.join(', ')}`
      )

      return { itineraryContext: context }
    })

    // Step 2: Generate seamless pattern with itinerary context
    const { patternResult, patternPath } = await step.run('generate-pattern', async () => {
      await jobRepository.updateStatus(jobId, 'running', 10)
      await jobRepository.logInfo(
        jobId,
        `生成图案: ${themeKeywords.join(', ')}${itineraryContext ? ` (行程主题: ${itineraryContext.destination})` : ''}`
      )

      const comfy = new ComfyClient()
      const result = await comfy.generatePattern({
        keywords: themeKeywords,
        colorMood,
        density,
        style: styleLock,
        itineraryContext,
      })

      // Upload pattern to Storage
      const path = `merch/patterns/${designId}.png`
      await uploadFile('MERCH', path, result.imageBuffer, 'image/png')

      return { patternResult: result, patternPath: path }
    })

    // Step 3: Determine views based on product type
    const { views } = await step.run('determine-views', async () => {
      await jobRepository.updateStatus(jobId, 'running', 30)

      const viewMap: Record<string, ViewType[]> = {
        mug: ['front', 'side', 'context'],
        phone_case: ['front', 'side', 'back', 'context'],
        tshirt: ['front', 'side', 'back', 'context'],
      }

      return { views: viewMap[productType] || ['front'] }
    })

    // Step 4: Generate mockups for product type
    const { mockupResults } = await step.run('generate-mockups', async () => {
      await jobRepository.updateStatus(jobId, 'running', 40)
      await jobRepository.logInfo(jobId, `生成 ${productType} 效果图...`)

      const comfy = new ComfyClient()

      // Generate short-lived signed URL for ComfyUI download
      const patternUrl = await getSignedUrl(
        'MERCH',
        patternPath,
        DEFAULT_SIGNED_URL_EXPIRES_IN
      )

      const results = await comfy.generateMockups({
        patternImageUrl: patternUrl,
        productType,
        views,
      })

      return { mockupResults: results }
    })

    // Step 5: Upload mockups to Storage
    const { mockupPaths } = await step.run('upload-mockups', async () => {
      await jobRepository.updateStatus(jobId, 'running', 70)
      await jobRepository.logInfo(jobId, '上传效果图到存储...')

      const paths: string[] = []

      for (let i = 0; i < mockupResults.length; i++) {
        const mockup = mockupResults[i]
        const path = `merch/mockups/${designId}_${views[i]}.png`

        // Convert Buffer-like object to Buffer if needed
        const buffer = toBuffer(mockup.imageBuffer)

        await uploadFile('MERCH', path, buffer, 'image/png')
        paths.push(path)
      }

      return { mockupPaths: paths }
    })

    // Step 6: Finalize and save artifacts
    await step.run('finalize', async () => {
      // Update merch design record
      await supabaseAdmin
        .from('merch_designs')
        .update({
          pattern_storage_path: patternPath,
          mockup_storage_paths: mockupPaths,
          status: 'ready',
        })
        .eq('id', designId)

      // Store artifacts in artifacts table
      const patternBuffer = toBuffer(patternResult.imageBuffer)

      const artifactRecords = [
        {
          merch_design_id: designId,
          itinerary_id: itineraryId || null,
          kind: 'pattern',
          storage_path: patternPath,
          storage_bucket: 'MERCH',
          file_size: patternBuffer.length,
          metadata: { format: 'png', mime_type: 'image/png' },
        },
        ...mockupPaths.map((path, i) => ({
          merch_design_id: designId,
          itinerary_id: itineraryId || null,
          kind: 'mockup',
          storage_path: path,
          storage_bucket: 'MERCH',
          metadata: { view: views[i], format: 'png', mime_type: 'image/png' },
        })),
      ]

      // Upsert artifacts (handles retries safely)
      const { data: upsertedArtifacts, error: artifactsError } = await supabaseAdmin
        .from('artifacts')
        .upsert(artifactRecords, {
          onConflict: 'merch_design_id,kind,storage_path',
        })
        .select('id, kind, storage_path')

      if (artifactsError) {
        throw artifactsError
      }

      const artifactRows = (upsertedArtifacts || []) as ArtifactUpsertRow[]
      const patternArtifact = artifactRows.find(
        (row) => row.kind === 'pattern'
      )
      const mockupArtifactIds = artifactRows
        .filter((row) => row.kind === 'mockup')
        .map((row) => row.id)

      await jobRepository.logInfo(jobId, '商品设计生成完成！')
      await jobRepository.updateStatus(jobId, 'done', 100, {
        designId,
        patternStoragePath: patternPath,
        mockupStoragePaths: mockupPaths,
        patternArtifactId: patternArtifact?.id || null,
        mockupArtifactIds,
        artifactsCount: artifactRows.length || artifactRecords.length,
      })
    })

    return {
      designId,
      patternPath,
      mockupPaths,
    }
  }
)
