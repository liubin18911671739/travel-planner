import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createEmbeddingsProvider, EmbeddingProviderType } from '@/lib/embeddings/stub'
import {
  RAGRetrievalRequestSchema,
  type RAGRetrievalResponse,
  type RetrievedChunk,
  type ErrorResponse,
} from '@/lib/knowledge/schemas'

type PackRow = { file_ids: string[] }
type SearchRow = {
  id: string
  file_id: string
  content: string
  metadata: Record<string, unknown> | null
  similarity: number
}
type FileRow = { id: string; name: string }

/**
 * POST /api/knowledge/search
 *
 * Perform RAG (Retrieval Augmented Generation) search on knowledge base.
 *
 * Request body:
 * - query: string (required) - Search query text
 * - packIds: string[] (optional) - Knowledge pack IDs to search within
 * - fileIds: string[] (optional) - Specific file IDs to search within
 * - topK: number (optional, default: 10) - Number of results to return
 * - threshold: number (optional, default: 0.7) - Minimum similarity score (0-1)
 *
 * Response:
 * - query: string - The original query
 * - chunks: RetrievedChunk[] - Array of retrieved chunks with similarity scores
 * - citations: Citation[] - Array of citations for attribution
 * - context: string - Formatted context string for LLM prompting
 *
 * Security: All searches are scoped to the authenticated user's data via RLS policies.
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' } as ErrorResponse,
        { status: 401 }
      )
    }

    const userId = user.id

    // Parse and validate request body
    const body = await request.json()
    const validationResult = RAGRetrievalRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: validationResult.error.errors[0]?.message,
          details: validationResult.error.errors,
        } as ErrorResponse,
        { status: 400 }
      )
    }

    const { query, packIds, fileIds, topK, threshold } = validationResult.data

    // Create embeddings provider
    const embeddingProviderType = (process.env.EMBEDDING_PROVIDER || 'stub') as EmbeddingProviderType
    const embeddingsProvider = createEmbeddingsProvider(embeddingProviderType, {
      dimension: 1536,
    })

    // Generate query embedding
    const { vector: queryVector } = await embeddingsProvider.embed(query)

    // Build the search query
    // If packIds are provided, get all file IDs from those packs
    let targetFileIds: string[] | null = null

    if (fileIds && fileIds.length > 0) {
      // Direct file IDs provided
      targetFileIds = fileIds
    } else if (packIds && packIds.length > 0) {
      // Get file IDs from packs
      const { data: packs, error: packError } = await supabase
        .from('knowledge_packs')
        .select('file_ids')
        .in('id', packIds)
        .eq('user_id', userId)

      if (packError) {
        return NextResponse.json(
          { error: 'Failed to fetch knowledge packs', message: packError.message } as ErrorResponse,
          { status: 500 }
        )
      }

      targetFileIds = ((packs || []) as PackRow[]).flatMap((p) => p.file_ids || [])

      if (targetFileIds.length === 0) {
        // No files in the specified packs
        const response: RAGRetrievalResponse = {
          query,
          chunks: [],
          citations: [],
          context: '没有找到相关知识。',
        }
        return NextResponse.json(response)
      }
    }

    // Perform vector similarity search using the database function
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'match_knowledge_chunks',
      {
        query_embedding: queryVector,
        match_threshold: threshold,
        match_count: topK,
        file_ids: targetFileIds,
      }
    )

    if (searchError) {
      console.error('RAG search error:', searchError)
      return NextResponse.json(
        { error: 'Search failed', message: searchError.message } as ErrorResponse,
        { status: 500 }
      )
    }

    // Get file names for citations
    const typedResults = ((searchResults || []) as SearchRow[])
    const chunkIds = typedResults.map((r) => r.file_id)
    const uniqueFileIds = [...new Set(chunkIds)]

    const { data: files } = await supabase
      .from('knowledge_files')
      .select('id, name')
      .in('id', uniqueFileIds)

    const fileMap = new Map(
      ((files || []) as FileRow[]).map((f) => [f.id, f.name])
    )

    // Build response
    const chunks: RetrievedChunk[] = typedResults.map((row) => ({
      id: row.id,
      fileId: row.file_id,
      fileName: fileMap.get(row.file_id),
      content: row.content,
      metadata: row.metadata || {},
      similarity: row.similarity,
    }))

    const citations = chunks.map((chunk) => ({
      chunkId: chunk.id,
      fileId: chunk.fileId,
      fileName: chunk.fileName || 'Unknown',
      similarity: chunk.similarity,
    }))

    // Format context for LLM prompting
    const context =
      chunks.length > 0
        ? chunks
            .map(
              (chunk, i) =>
                `[来源${i + 1}, 相似度: ${(chunk.similarity * 100).toFixed(1)}%, 文件: ${chunk.fileName || 'Unknown'}]\n${chunk.content}`
            )
            .join('\n\n---\n\n')
        : '没有找到相关知识。'

    const response: RAGRetrievalResponse = {
      query,
      chunks,
      citations,
      context,
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Knowledge search error:', error)
    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : String(error),
      } as ErrorResponse,
      { status: 500 }
    )
  }
}
