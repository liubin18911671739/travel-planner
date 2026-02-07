import { inngest } from '@/lib/queue/client'
import { jobRepository } from '@/lib/jobs/repository'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { downloadFile } from '@/lib/storage/helper'
import { createEmbeddingsProvider, EmbeddingProviderType } from '@/lib/embeddings/stub'
import { extractText, cleanExtractedText } from '@/lib/knowledge/extraction'
import { splitIntoChunks, type ChunkingOptions } from '@/lib/knowledge/chunking'

/**
 * Knowledge Indexing Inngest Function
 *
 * This function handles the complete indexing pipeline for knowledge files:
 * 1. Download file from Supabase Storage
 * 2. Extract text based on file type
 * 3. Split text into chunks with metadata
 * 4. Generate embeddings for chunks
 * 5. Store chunks in database with vectors
 * 6. Update file status to ready
 *
 * Event: knowledge/index.requested
 * Data: { jobId, fileId, userId }
 */

// Chunking configuration
const CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 1000,      // 800-1200 chars per chunk
  chunkOverlap: 150,    // Overlap for context preservation
  minChunkSize: 50,     // Minimum chunk size
  separator: '\n\n',    // Paragraph separator
  keepSeparator: true,
}

// Embedding provider type from env (default to stub for development)
const EMBEDDING_PROVIDER_TYPE = (process.env.EMBEDDING_PROVIDER || 'stub') as EmbeddingProviderType

interface KnowledgeFile {
  id: string
  user_id: string
  name: string
  file_type: string
  storage_path: string
  metadata?: Record<string, any>
}


/**
 * Inngest function: Index a knowledge file.
 */
export const indexKnowledge = inngest.createFunction(
  { id: 'index-knowledge' },
  { event: 'knowledge/index.requested' },
  async ({ event, step }) => {
    const { jobId, fileId, userId } = event.data

    // Step 1: Update job status to running
    await step.run('update-job-status', async () => {
      await jobRepository.updateStatus(jobId, 'running', 10)
      await jobRepository.logInfo(jobId, '开始索引文件...')
    })

    // Step 2: Get file info from database
    const fileInfo = await step.run('get-file-info', async () => {
      const { data, error } = await supabaseAdmin
        .from('knowledge_files')
        .select('*')
        .eq('id', fileId)
        .single()

      if (error || !data) {
        throw new Error(`File not found: ${fileId}`)
      }

      const file = data as unknown as KnowledgeFile

      // Verify user ownership
      if (file.user_id !== userId) {
        throw new Error(`Access denied: User does not own this file`)
      }

      return { file }
    })

    const file = fileInfo.file as KnowledgeFile

    // Step 3: Update file status to indexing
    await step.run('update-file-status', async () => {
      await (supabaseAdmin
        .from('knowledge_files') as any)
        .update({ status: 'indexing' })
        .eq('id', fileId)
    })

    // Step 4: Download file from Storage
    const downloadResult = await step.run('download-file', async () => {
      await jobRepository.logInfo(jobId, '从存储下载文件...')
      return await downloadFile('KNOWLEDGE', file.storage_path)
    })

    const buffer = Buffer.isBuffer(downloadResult.buffer)
      ? downloadResult.buffer
      : Buffer.from(downloadResult.buffer as any)

    // Step 5: Extract text from file
    const extractionResult = await step.run('extract-text', async () => {
      await jobRepository.updateStatus(jobId, 'running', 20)
      await jobRepository.logInfo(jobId, `提取文本 (${file.file_type})...`)

      const extracted = await extractText(buffer, file.file_type as any)
      const cleaned = cleanExtractedText(extracted.text)

      if (cleaned.length < 10) {
        throw new Error(`Extracted text too short: ${cleaned.length} characters`)
      }

      await jobRepository.logInfo(
        jobId,
        `文本提取完成: ${cleaned.length} 字符`
      )

      return { cleanedText: cleaned }
    })

    const cleanedText = extractionResult.cleanedText

    // Step 6: Split into chunks
    const chunkingResult = await step.run('chunk-text', async () => {
      await jobRepository.updateStatus(jobId, 'running', 30)
      await jobRepository.logInfo(jobId, '分块文本...')

      const chunkList = splitIntoChunks(cleanedText, {
        ...CHUNKING_OPTIONS,
        metadata: {
          fileType: file.file_type,
          source: file.name,
        },
      })

      await jobRepository.logInfo(
        jobId,
        `文本分块完成: ${chunkList.length} 个块`
      )

      return { chunks: chunkList }
    })

    const chunks = chunkingResult.chunks

    // Step 7: Generate embeddings
    const embeddingResult = await step.run('generate-embeddings', async () => {
      await jobRepository.updateStatus(jobId, 'running', 50)
      await jobRepository.logInfo(jobId, `生成 ${chunks.length} 个块的嵌入...`)

      const provider = createEmbeddingsProvider(EMBEDDING_PROVIDER_TYPE, {
        dimension: 1536, // OpenAI text-embedding-3-small default
      })

      const chunkTexts = chunks.map((c) => c.content)
      const results = await provider.embedBatch(chunkTexts)

      await jobRepository.logInfo(
        jobId,
        `嵌入生成完成: 维度 ${results[0]?.dimension || 'unknown'}`
      )

      return { embeddings: results }
    })

    const embeddings = embeddingResult.embeddings

    // Step 8: Delete existing chunks for this file (re-indexing)
    await step.run('cleanup-old-chunks', async () => {
      await jobRepository.logInfo(jobId, '清理旧的索引数据...')
      await supabaseAdmin
        .from('knowledge_chunks')
        .delete()
        .eq('file_id', fileId)
    })

    // Step 9: Store chunks with embeddings
    await step.run('store-chunks', async () => {
      await jobRepository.updateStatus(jobId, 'running', 80)
      await jobRepository.logInfo(jobId, '存储块到数据库...')

      // Prepare records for batch insert
      const chunkRecords = chunks.map((chunk, index) => ({
        file_id: fileId,
        chunk_index: index,
        content: chunk.content,
        embedding: embeddings[index].vector,
        metadata: {
          ...chunk.metadata,
          fileType: file.file_type,
          chunkSize: chunk.content.length,
        },
      }))

      // Insert in batches of 100 to avoid payload limits
      const batchSize = 100
      for (let i = 0; i < chunkRecords.length; i += batchSize) {
        const batch = chunkRecords.slice(i, i + batchSize)
        const { error } = await supabaseAdmin
          .from('knowledge_chunks')
          .insert(batch as any)

        if (error) {
          throw new Error(`Failed to store chunks (batch ${Math.floor(i / batchSize)}): ${error.message}`)
        }
      }

      await jobRepository.logInfo(
        jobId,
        `存储完成: ${chunkRecords.length} 个块`
      )
    })

    // Step 10: Update file status to ready
    await step.run('finalize', async () => {
      await jobRepository.logInfo(jobId, `索引完成: ${chunks.length} 个块`)

      await (supabaseAdmin
        .from('knowledge_files') as any)
        .update({
          status: 'ready',
          chunk_count: chunks.length,
          last_indexed_at: new Date().toISOString(),
          metadata: {
            ...(file.metadata || {}),
            extractedCharCount: cleanedText.length,
            embeddingProvider: EMBEDDING_PROVIDER_TYPE,
            embeddingDimension: embeddings[0]?.dimension,
          },
        })
        .eq('id', fileId)

      await jobRepository.updateStatus(jobId, 'done', 100, {
        fileId,
        chunkCount: chunks.length,
        charCount: cleanedText.length,
      })
    })

    return {
      fileId,
      chunkCount: chunks.length,
      charCount: cleanedText.length,
      embeddingDimension: embeddings[0]?.dimension,
    }
  }
)

/**
 * Inngest function: Delete a knowledge file and its chunks.
 *
 * Event: knowledge/delete.requested
 * Data: { jobId, fileId, userId }
 */
export const deleteKnowledge = inngest.createFunction(
  { id: 'delete-knowledge' },
  { event: 'knowledge/delete.requested' },
  async ({ event, step }) => {
    const { fileId, userId } = event.data

    // Step 1: Get file info
    const fileInfo = await step.run('get-file-info', async () => {
      const { data, error } = await supabaseAdmin
        .from('knowledge_files')
        .select('*')
        .eq('id', fileId)
        .single()

      if (error || !data) {
        throw new Error(`File not found: ${fileId}`)
      }

      const file = data as unknown as KnowledgeFile

      if (file.user_id !== userId) {
        throw new Error(`Access denied: User does not own this file`)
      }

      return { file }
    })

    const file = fileInfo.file as KnowledgeFile

    // Step 2: Delete file from storage
    await step.run('delete-from-storage', async () => {
      await supabaseAdmin.storage
        .from('knowledge')
        .remove([file.storage_path])
    })

    // Step 3: Delete chunks (cascade should handle this, but explicit is safer)
    await step.run('delete-chunks', async () => {
      await supabaseAdmin
        .from('knowledge_chunks')
        .delete()
        .eq('file_id', fileId)
    })

    // Step 4: Delete file record
    await step.run('delete-file-record', async () => {
      await supabaseAdmin
        .from('knowledge_files')
        .delete()
        .eq('id', fileId)
    })

    return { fileId, deleted: true }
  }
)
