/**
 * Text Chunking Strategy
 *
 * Implements intelligent text chunking for RAG with:
 * - Configurable chunk size and overlap
 * - Metadata preservation (page numbers, source)
 * - Boundary-aware splitting (sentences, paragraphs)
 */

export interface ChunkMetadata {
  fileType?: string
  chunkSize: number
  startIndex?: number
  endIndex?: number
  page?: number
  source?: string
  [key: string]: unknown
}

export interface TextChunk {
  content: string
  metadata: ChunkMetadata
}

export interface ChunkingOptions {
  chunkSize?: number // Target chunk size in characters (default: 1000)
  chunkOverlap?: number // Overlap between chunks (default: 150)
  minChunkSize?: number // Minimum chunk size (default: 50)
  separator?: string // Separator to use for splitting (default: '\n\n')
  keepSeparator?: boolean // Whether to keep separator in chunks (default: true)
  metadata?: Record<string, unknown> // Additional metadata to attach to all chunks
}

/**
 * Default chunking options optimized for RAG.
 */
export const DEFAULT_CHUNKING_OPTIONS: Required<ChunkingOptions> = {
  chunkSize: 1000,
  chunkOverlap: 150,
  minChunkSize: 50,
  separator: '\n\n',
  keepSeparator: true,
  metadata: {},
}

/**
 * Split text into chunks with overlap.
 *
 * Uses a sliding window approach with overlap to ensure
 * context is preserved across chunk boundaries.
 *
 * @param text - Text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 */
export function splitIntoChunks(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options }
  const chunks: TextChunk[] = []

  // Clean the text first
  const cleanedText = text.trim()

  if (cleanedText.length <= opts.chunkSize) {
    // Text fits in a single chunk
    return [{
      content: cleanedText,
      metadata: {
        ...opts.metadata,
        chunkSize: cleanedText.length,
        startIndex: 0,
        endIndex: cleanedText.length,
      },
    }]
  }

  // Split by separator first to respect paragraph boundaries
  const segments = cleanedText.split(opts.separator)
  const currentChunks: string[] = []
  let currentLength = 0
  let globalIndex = 0

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentWithSeparator = opts.keepSeparator && i > 0
      ? opts.separator + segment
      : segment
    const segmentLength = segmentWithSeparator.length

    // If a single segment is larger than chunk size, split it further
    if (segmentLength > opts.chunkSize) {
      // Flush current chunks if any
      if (currentChunks.length > 0) {
        const chunkContent = currentChunks.join('')
        chunks.push(createChunk(chunkContent, globalIndex, opts.metadata))
        globalIndex += chunkContent.length
        currentChunks.length = 0
        currentLength = 0
      }

      // Split the large segment character-wise
      const charChunks = splitLargeSegment(segment, opts.chunkSize, opts.chunkOverlap)
      for (const charChunk of charChunks) {
        if (charChunk.length >= opts.minChunkSize) {
          chunks.push(createChunk(charChunk, globalIndex, opts.metadata))
          globalIndex += charChunk.length
        }
      }
      continue
    }

    // Check if adding this segment would exceed chunk size
    if (currentLength + segmentLength > opts.chunkSize && currentChunks.length > 0) {
      // Create chunk from current segments
      const chunkContent = currentChunks.join('')
      if (chunkContent.length >= opts.minChunkSize) {
        chunks.push(createChunk(chunkContent, globalIndex, opts.metadata))
        globalIndex += chunkContent.length

        // Handle overlap: keep some segments from previous chunk
        const overlapSegments = getOverlapSegments(
          currentChunks,
          opts.chunkOverlap,
          opts.separator
        )
        currentChunks.length = 0
        currentChunks.push(...overlapSegments)
        currentLength = overlapSegments.join('').length
      } else {
        currentChunks.length = 0
        currentLength = 0
      }
    }

    currentChunks.push(segmentWithSeparator)
    currentLength += segmentLength
  }

  // Add final chunk
  if (currentChunks.length > 0) {
    const chunkContent = currentChunks.join('')
    if (chunkContent.length >= opts.minChunkSize) {
      chunks.push(createChunk(chunkContent, globalIndex, opts.metadata))
    }
  }

  return chunks
}

/**
 * Split a large segment into character-based chunks with overlap.
 */
function splitLargeSegment(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)

    // Try to find a good breaking point (space, punctuation)
    let breakPoint = end
    if (end < text.length) {
      // Look backward for a break point
      const searchRange = Math.min(100, end - start)
      for (let i = 0; i < searchRange; i++) {
        const char = text[end - i]
        if (char === ' ' || char === '\n' || char === '\t') {
          breakPoint = end - i
          break
        }
      }
    }

    chunks.push(text.slice(start, breakPoint).trim())
    start = breakPoint - overlap
  }

  return chunks.filter(c => c.length > 0)
}

/**
 * Get segments for overlap from previous chunk.
 */
function getOverlapSegments(
  segments: string[],
  overlapSize: number,
  separator: string
): string[] {
  const overlapSegments: string[] = []
  let accumulatedLength = 0

  for (let i = segments.length - 1; i >= 0; i--) {
    const segmentLength = segments[i].length
    accumulatedLength += segmentLength

    if (accumulatedLength >= overlapSize) {
      overlapSegments.unshift(segments[i])
      break
    }

    overlapSegments.unshift(segments[i])
  }

  return overlapSegments
}

/**
 * Create a chunk object with metadata.
 */
function createChunk(
  content: string,
  startIndex: number,
  baseMetadata: Record<string, unknown>
): TextChunk {
  return {
    content: content.trim(),
    metadata: {
      ...baseMetadata,
      chunkSize: content.length,
      startIndex,
      endIndex: startIndex + content.length,
    },
  }
}

/**
 * Split text into chunks by page numbers.
 *
 * Useful for PDFs where page metadata is preserved.
 *
 * @param pages - Array of page texts
 * @param options - Chunking options
 * @returns Array of text chunks with page metadata
 */
export function splitIntoChunksByPages(
  pages: Array<{ text: string; pageNumber: number }>,
  options: ChunkingOptions = {}
): TextChunk[] {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options }
  const allChunks: TextChunk[] = []

  for (const page of pages) {
    const pageChunks = splitIntoChunks(page.text, {
      ...opts,
      metadata: {
        ...opts.metadata,
        page: page.pageNumber,
        source: `page_${page.pageNumber}`,
      },
    })
    allChunks.push(...pageChunks)
  }

  return allChunks
}

/**
 * Split text into chunks by sentence boundaries.
 *
 * Better for maintaining semantic coherence.
 *
 * @param text - Text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks
 */
export function splitIntoChunksBySentences(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options }

  // Split by sentence boundaries (Chinese and English)
  const sentences = text
    .replace(/([。！？\.!?])\s*/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const chunks: TextChunk[] = []
  const currentChunk: string[] = []
  let currentLength = 0
  let globalIndex = 0

  for (const sentence of sentences) {
    const sentenceLength = sentence.length

    if (currentLength + sentenceLength > opts.chunkSize && currentChunk.length > 0) {
      // Create chunk
      const content = currentChunk.join(' ')
      if (content.length >= opts.minChunkSize) {
        chunks.push(createChunk(content, globalIndex, opts.metadata))
        globalIndex += content.length
      }

      // Handle overlap by keeping last few sentences
      const overlapSentences: string[] = []
      let overlapLength = 0
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        overlapLength += currentChunk[i].length
        overlapSentences.unshift(currentChunk[i])
        if (overlapLength >= opts.chunkOverlap) break
      }

      currentChunk.length = 0
      currentChunk.push(...overlapSentences)
      currentLength = overlapLength
    }

    currentChunk.push(sentence)
    currentLength += sentenceLength
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    const content = currentChunk.join(' ')
    if (content.length >= opts.minChunkSize) {
      chunks.push(createChunk(content, globalIndex, opts.metadata))
    }
  }

  return chunks
}

/**
 * Estimate token count for a text string.
 *
 * Approximate: 1 token ≈ 4 characters for English, 2-3 for Chinese.
 *
 * @param text - Text to estimate
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  // Count Chinese characters
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  // Count other characters
  const otherChars = text.length - chineseChars

  // Chinese: ~1.5 chars per token, English: ~4 chars per token
  return Math.ceil(chineseChars / 1.5 + otherChars / 4)
}

/**
 * Validate chunk meets quality standards.
 *
 * @param chunk - Chunk to validate
 * @param minSize - Minimum size
 * @returns True if chunk is valid
 */
export function isValidChunk(chunk: TextChunk, minSize: number = 50): boolean {
  const trimmed = chunk.content.trim()
  return trimmed.length >= minSize
}

/**
 * Merge small chunks with neighbors.
 *
 * @param chunks - Chunks to merge
 * @param targetSize - Target chunk size
 * @returns Merged chunks
 */
export function mergeSmallChunks(
  chunks: TextChunk[],
  targetSize: number = DEFAULT_CHUNKING_OPTIONS.chunkSize
): TextChunk[] {
  const merged: TextChunk[] = []
  let current = chunks[0]

  for (let i = 1; i < chunks.length; i++) {
    const next = chunks[i]
    const combinedSize = current.content.length + next.content.length

    if (combinedSize <= targetSize) {
      // Merge chunks
      current = {
        content: current.content + '\n\n' + next.content,
        metadata: {
          ...current.metadata,
          chunkSize: combinedSize,
          endIndex: next.metadata.endIndex,
        },
      }
    } else {
      merged.push(current)
      current = next
    }
  }

  if (current) {
    merged.push(current)
  }

  return merged
}
