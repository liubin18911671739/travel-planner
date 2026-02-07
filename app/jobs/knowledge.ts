import { inngest } from '@/lib/queue/client'
import { jobRepository } from '@/lib/jobs/repository'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { downloadFile } from '@/lib/storage/helper'
import { createEmbeddingsProvider } from '@/lib/embeddings/stub'

/**
 * Text extraction utilities.
 * These are stub implementations - replace with actual libraries in production.
 */

const CHUNK_SIZE = 1000 // characters per chunk
const CHUNK_OVERLAP = 200 // characters overlap

/**
 * Extract text from a file buffer based on its type.
 */
async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  // In production, use:
  // - PDF: pdf-parse or pdfjs-dist
  // - DOCX: mammoth
  // - TXT: buffer.toString('utf-8')
  // - Image: Tesseract.js OCR

  switch (fileType) {
    case 'PDF':
      // Stub: return placeholder text
      return '[PDF content would be extracted here using pdf-parse]'

    case 'DOCX':
      // Stub: return placeholder text
      return '[DOCX content would be extracted here using mammoth]'

    case 'TXT':
      return buffer.toString('utf-8')

    case 'JPG':
    case 'JPEG':
    case 'PNG':
      // Stub: OCR would happen here
      return '[Image text would be extracted here using Tesseract.js]'

    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Split text into chunks with overlap.
 */
function splitIntoChunks(text: string, chunkSize: number = CHUNK_SIZE): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start = end - CHUNK_OVERLAP
  }

  return chunks
}

/**
 * Inngest function: Index a knowledge file.
 *
 * Event: knowledge/index
 * Data: { jobId, fileId, userId }
 */
export const indexKnowledge = inngest.createFunction(
  { id: 'index-knowledge' },
  { event: 'knowledge/index' },
  async ({ event, step }) => {
    const { jobId, fileId, userId } = event.data

    // Step 1: Update job status to running
    await step.run('update-job-status', async () => {
      await jobRepository.updateStatus(jobId, 'running', 10)
      await jobRepository.logInfo(jobId, '开始索引文件...')
    })

    // Step 2: Get file info from database
    const { file } = await step.run('get-file-info', async () => {
      const { data, error } = await supabaseAdmin
        .from('knowledge_files')
        .select('*')
        .eq('id', fileId)
        .single()

      if (error || !data) {
        throw new Error(`File not found: ${fileId}`)
      }

      return { file: data }
    })

    // Step 3: Download file from Storage
    const { buffer } = await step.run('download-file', async () => {
      await jobRepository.logInfo(jobId, '从存储下载文件...')
      return await downloadFile('KNOWLEDGE', file.storage_path)
    })

    // Step 4: Extract text from file
    const { text } = await step.run('extract-text', async () => {
      await jobRepository.updateStatus(jobId, 'running', 20)
      await jobRepository.logInfo(jobId, `提取文本 (${file.file_type})...`)
      const content = await extractText(buffer, file.file_type)
      return { text: content }
    })

    // Step 5: Split into chunks
    const { chunks } = await step.run('chunk-text', async () => {
      await jobRepository.updateStatus(jobId, 'running', 30)
      await jobRepository.logInfo(jobId, '分块文本...')
      const chunkList = splitIntoChunks(text)
      return { chunks: chunkList }
    })

    // Step 6: Generate embeddings
    const { embeddings } = await step.run('generate-embeddings', async () => {
      await jobRepository.updateStatus(jobId, 'running', 50)
      await jobRepository.logInfo(jobId, `生成 ${chunks.length} 个块的嵌入...`)

      const provider = createEmbeddingsProvider('stub')
      const results = await provider.embedBatch(chunks)

      return { embeddings: results }
    })

    // Step 7: Store chunks with embeddings
    await step.run('store-chunks', async () => {
      await jobRepository.updateStatus(jobId, 'running', 80)
      await jobRepository.logInfo(jobId, '存储块到数据库...')

      const chunkRecords = chunks.map((chunk, index) => ({
        file_id: fileId,
        chunk_index: index,
        content: chunk,
        embedding: embeddings[index].vector,
        metadata: {
          fileType: file.file_type,
          chunkSize: chunk.length,
        },
      }))

      const { error } = await supabaseAdmin
        .from('knowledge_chunks')
        .insert(chunkRecords)

      if (error) {
        throw new Error(`Failed to store chunks: ${error.message}`)
      }
    })

    // Step 8: Update file status to ready
    await step.run('finalize', async () => {
      await jobRepository.logInfo(jobId, `索引完成: ${chunks.length} 个块`)

      await supabaseAdmin
        .from('knowledge_files')
        .update({
          status: 'ready',
          chunk_count: chunks.length,
          last_indexed_at: new Date().toISOString(),
        })
        .eq('id', fileId)

      await jobRepository.updateStatus(jobId, 'done', 100, {
        fileId,
        chunkCount: chunks.length,
      })
    })

    return {
      fileId,
      chunkCount: chunks.length,
    }
  }
)
