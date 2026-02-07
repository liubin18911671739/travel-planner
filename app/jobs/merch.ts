import { inngest } from '@/lib/queue/client'
import { jobRepository } from '@/lib/jobs/repository'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ComfyClient } from '@/lib/comfy/client'
import { uploadFile } from '@/lib/storage/helper'
import { BUCKETS } from '@/lib/storage/buckets'

type ViewType = 'front' | 'side' | 'back' | 'context'

/**
 * Inngest function: Generate merchandise design.
 *
 * Event: merch/generate
 * Data: { jobId, designId, userId, productType, themeKeywords, colorMood, density, styleLock }
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
    } = event.data

    // Step 1: Initialize
    await step.run('initialize', async () => {
      await jobRepository.updateStatus(jobId, 'running', 5)
      await jobRepository.logInfo(jobId, '开始生成商品设计...')
    })

    // Step 2: Generate seamless pattern
    const { patternResult, patternPath } = await step.run('generate-pattern', async () => {
      await jobRepository.updateStatus(jobId, 'running', 10)
      await jobRepository.logInfo(
        jobId,
        `生成图案: ${themeKeywords.join(', ')}`
      )

      const comfy = new ComfyClient()
      const result = await comfy.generatePattern({
        keywords: themeKeywords,
        colorMood,
        density,
        style: styleLock,
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

      // Get public URL for pattern (ComfyUI will download it)
      // In production, generate a signed URL
      const patternUrl = `https://storage.yourdomain.com/${patternPath}`

      const results = await comfy.generateMockups({
        patternImageUrl: patternUrl,
        productType: productType as any,
        views: views as any,
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
        const buffer = Buffer.isBuffer(mockup.imageBuffer)
          ? mockup.imageBuffer
          : Buffer.from(mockup.imageBuffer as any)

        await uploadFile('MERCH', path, buffer, 'image/png')
        paths.push(path)
      }

      return { mockupPaths: paths }
    })

    // Step 6: Finalize
    await step.run('finalize', async () => {
      await (supabaseAdmin
        .from('merch_designs') as any)
        .update({
          pattern_storage_path: patternPath,
          mockup_storage_paths: mockupPaths,
          status: 'ready',
        })
        .eq('id', designId)

      await jobRepository.logInfo(jobId, '商品设计生成完成！')
      await jobRepository.updateStatus(jobId, 'done', 100, {
        designId,
        patternPath,
        mockupPaths,
      })
    })

    return {
      designId,
      patternPath,
      mockupPaths,
    }
  }
)
