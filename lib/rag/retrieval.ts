import { supabaseAdmin } from '@/lib/supabase/admin'
import { EmbeddingsProvider } from '@/lib/embeddings/provider'

/**
 * RAG (Retrieval Augmented Generation) retrieval result.
 */
export interface RetrievedChunk {
  id: string
  fileId: string
  content: string
  metadata: Record<string, any>
  similarity: number
}

/**
 * Options for RAG retrieval.
 */
export interface RetrievalOptions {
  k?: number // Number of results to return
  threshold?: number // Minimum similarity score (0-1)
  fileIds?: string[] // Restrict search to specific files
}

/**
 * RAGRetrieval class for performing vector similarity search.
 *
 * Uses pgvector cosine similarity to find the most relevant
 * text chunks for a given query.
 */
export class RAGRetrieval {
  constructor(private embeddingsProvider: EmbeddingsProvider) {}

  /**
   * Retrieve top-k chunks by cosine similarity across all packs.
   *
   * @param query - Search query text
   * @param knowledgePackIds - Optional pack IDs to restrict search
   * @param options - Retrieval options
   * @returns Array of retrieved chunks with similarity scores
   */
  async retrieveTopK(
    query: string,
    knowledgePackIds: string[] = [],
    options: RetrievalOptions = {}
  ): Promise<RetrievedChunk[]> {
    const { k = 10, threshold = 0.3 } = options

    // Generate query embedding
    const { vector } = await this.embeddingsProvider.embed(query)

    // Get file IDs from packs if specified
    let fileIds: string[] | null = null
    if (knowledgePackIds.length > 0) {
      const { data: packs } = await supabaseAdmin
        .from('knowledge_packs')
        .select('file_ids')
        .in('id', knowledgePackIds)

      fileIds = packs?.flatMap((p) => p.file_ids) || []

      if (fileIds.length === 0) {
        return []
      }
    }

    // Vector similarity search using pgvector RPC
    const { data, error } = await supabaseAdmin.rpc('match_knowledge_chunks', {
      query_embedding: vector,
      match_threshold: threshold,
      match_count: k,
      file_ids: fileIds,
    })

    if (error) {
      throw new Error(`RAG retrieval failed: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      fileId: row.file_id,
      content: row.content,
      metadata: row.metadata || {},
      similarity: row.similarity,
    }))
  }

  /**
   * Retrieve chunks from a specific file.
   *
   * @param fileId - Knowledge file ID
   * @param query - Search query text
   * @param options - Retrieval options
   * @returns Array of retrieved chunks with similarity scores
   */
  async retrieveFromFile(
    fileId: string,
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievedChunk[]> {
    const { k = 10 } = options

    const { vector } = await this.embeddingsProvider.embed(query)

    const { data, error } = await supabaseAdmin.rpc('match_file_chunks', {
      query_embedding: vector,
      file_id: fileId,
      match_count: k,
    })

    if (error) {
      throw new Error(`File retrieval failed: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      fileId: row.file_id,
      content: row.content,
      metadata: row.metadata || {},
      similarity: row.similarity,
    }))
  }

  /**
   * Hybrid search: combine vector search with keyword filtering.
   *
   * @param query - Search query text
   * @param keywords - Keywords that must be present in results
   * @param knowledgePackIds - Optional pack IDs to restrict search
   * @param options - Retrieval options
   * @returns Filtered array of retrieved chunks
   */
  async retrieveWithKeywords(
    query: string,
    keywords: string[],
    knowledgePackIds: string[] = [],
    options: RetrievalOptions = {}
  ): Promise<RetrievedChunk[]> {
    // First do vector search
    const results = await this.retrieveTopK(query, knowledgePackIds, options)

    // Filter by keyword presence
    const lowerKeywords = keywords.map((k) => k.toLowerCase())

    return results.filter((chunk) => {
      const content = chunk.content.toLowerCase()
      return lowerKeywords.some((keyword) => content.includes(keyword))
    })
  }

  /**
   * Get contextual summary of retrieved chunks.
   *
   * @param query - Search query
   * @param knowledgePackIds - Optional pack IDs
   * @param options - Retrieval options
   * @returns Formatted context string for LLM prompting
   */
  async retrieveAsContext(
    query: string,
    knowledgePackIds: string[] = [],
    options: RetrievalOptions = {}
  ): Promise<string> {
    const chunks = await this.retrieveTopK(query, knowledgePackIds, options)

    if (chunks.length === 0) {
      return '没有找到相关知识。'
    }

    return chunks
      .map(
        (chunk, i) =>
          `[来源${i + 1}, 相似度: ${(chunk.similarity * 100).toFixed(1)}%]\n${chunk.content}`
      )
      .join('\n\n---\n\n')
  }
}

/**
 * Create a RAGRetrieval instance with the given embeddings provider.
 */
export function createRAGRetrieval(embeddingsProvider: EmbeddingsProvider): RAGRetrieval {
  return new RAGRetrieval(embeddingsProvider)
}
