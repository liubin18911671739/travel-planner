import { z } from 'zod'

// ============================================================================
// File Type Constants
// ============================================================================

export const SUPPORTED_FILE_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT: 'text/plain',
  JPG: 'image/jpeg',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
} as const

export const FILE_TYPE_MAPPING = {
  pdf: 'PDF',
  docx: 'DOCX',
  txt: 'TXT',
  jpg: 'JPG',
  jpeg: 'JPG',
  png: 'PNG',
} as const

export type SupportedFileType = keyof typeof SUPPORTED_FILE_TYPES

// ============================================================================
// Knowledge File Status
// ============================================================================

export const KnowledgeFileStatusSchema = z.enum(['pending', 'indexing', 'ready', 'failed'])
export type KnowledgeFileStatus = z.infer<typeof KnowledgeFileStatusSchema>

// ============================================================================
// Upload Request Schema
// ============================================================================

export const KnowledgeUploadRequestSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => Object.values(SUPPORTED_FILE_TYPES).includes(file.type as (typeof SUPPORTED_FILE_TYPES)[SupportedFileType]),
    `Unsupported file type. Supported: PDF, DOCX, TXT, JPG, PNG`
  ).refine(
    (file) => file.size <= 10 * 1024 * 1024,
    'File size exceeds 10MB limit'
  ),
})

export type KnowledgeUploadRequest = z.infer<typeof KnowledgeUploadRequestSchema>

// ============================================================================
// Upload Response Schema
// ============================================================================

export const KnowledgeUploadResponseSchema = z.object({
  fileId: z.string().uuid(),
  status: KnowledgeFileStatusSchema,
  jobId: z.string().uuid(),
})

export type KnowledgeUploadResponse = z.infer<typeof KnowledgeUploadResponseSchema>

// ============================================================================
// Knowledge File Schema
// ============================================================================

export const KnowledgeFileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  fileType: z.enum(['PDF', 'DOCX', 'TXT', 'JPG', 'JPEG', 'PNG']),
  fileSize: z.number().int().nonnegative(),
  storagePath: z.string(),
  status: KnowledgeFileStatusSchema,
  chunkCount: z.number().int().nonnegative().default(0),
  lastIndexedAt: z.string().datetime().nullable(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type KnowledgeFile = z.infer<typeof KnowledgeFileSchema>

// ============================================================================
// Knowledge File List Response Schema
// ============================================================================

export const KnowledgeFileListResponseSchema = z.object({
  files: z.array(KnowledgeFileSchema),
  total: z.number().int().nonnegative(),
})

export type KnowledgeFileListResponse = z.infer<typeof KnowledgeFileListResponseSchema>

// ============================================================================
// Knowledge Pack Schema
// ============================================================================

export const KnowledgePackSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  fileIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type KnowledgePack = z.infer<typeof KnowledgePackSchema>

// ============================================================================
// Knowledge Pack Create/Update Request Schema
// ============================================================================

export const KnowledgePackCreateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(1000).optional(),
  fileIds: z.array(z.string().uuid()).min(1, 'At least one file is required'),
})

export type KnowledgePackCreateRequest = z.infer<typeof KnowledgePackCreateRequestSchema>

export const KnowledgePackUpdateRequestSchema = KnowledgePackCreateRequestSchema.partial().extend({
  fileIds: z.array(z.string().uuid()).optional(),
})

export type KnowledgePackUpdateRequest = z.infer<typeof KnowledgePackUpdateRequestSchema>

// ============================================================================
// Knowledge Pack Response Schema
// ============================================================================

export const KnowledgePackResponseSchema = z.object({
  pack: KnowledgePackSchema,
})

export type KnowledgePackResponse = z.infer<typeof KnowledgePackResponseSchema>

export const KnowledgePackListResponseSchema = z.object({
  packs: z.array(KnowledgePackSchema.extend({
    fileCount: z.number().int().nonnegative(),
  })),
  total: z.number().int().nonnegative(),
})

export type KnowledgePackListResponse = z.infer<typeof KnowledgePackListResponseSchema>

// ============================================================================
// Knowledge Chunk Schema (Internal)
// ============================================================================

export interface KnowledgeChunkMetadata {
  fileType?: string
  chunkSize?: number
  page?: number
  startIndex?: number
  endIndex?: number
  source?: string
}

export const KnowledgeChunkSchema = z.object({
  id: z.string().uuid(),
  fileId: z.string().uuid(),
  chunkIndex: z.number().int().nonnegative(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
})

export type KnowledgeChunk = z.infer<typeof KnowledgeChunkSchema>

// ============================================================================
// RAG Retrieval Schemas
// ============================================================================

export const RAGRetrievalRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000, 'Query too long'),
  packIds: z.array(z.string().uuid()).optional(),
  fileIds: z.array(z.string().uuid()).optional(),
  topK: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
})

export type RAGRetrievalRequest = z.infer<typeof RAGRetrievalRequestSchema>

export const RetrievedChunkSchema = z.object({
  id: z.string().uuid(),
  fileId: z.string().uuid(),
  fileName: z.string().optional(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  similarity: z.number().min(0).max(1),
})

export type RetrievedChunk = z.infer<typeof RetrievedChunkSchema>

export const RAGRetrievalResponseSchema = z.object({
  query: z.string(),
  chunks: z.array(RetrievedChunkSchema),
  citations: z.array(z.object({
    chunkId: z.string().uuid(),
    fileId: z.string().uuid(),
    fileName: z.string(),
    similarity: z.number().min(0).max(1),
  })),
  context: z.string().optional(),
})

export type RAGRetrievalResponse = z.infer<typeof RAGRetrievalResponseSchema>

// ============================================================================
// Inngest Event Schemas
// ============================================================================

export const KnowledgeIndexRequestedEventSchema = z.object({
  name: z.literal('knowledge/index.requested'),
  data: z.object({
    jobId: z.string().uuid(),
    fileId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
})

export type KnowledgeIndexRequestedEvent = z.infer<typeof KnowledgeIndexRequestedEventSchema>

// ============================================================================
// Error Response Schema
// ============================================================================

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// ============================================================================
// Common Validation Helpers
// ============================================================================

export function validateFileType(mimeType: string): boolean {
  return Object.values(SUPPORTED_FILE_TYPES).includes(
    mimeType as (typeof SUPPORTED_FILE_TYPES)[SupportedFileType]
  )
}

export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext || ''
}

export function normalizeFileType(mimeType: string, filename: string): string {
  const ext = getFileExtension(filename)
  if (ext && FILE_TYPE_MAPPING[ext as keyof typeof FILE_TYPE_MAPPING]) {
    return FILE_TYPE_MAPPING[ext as keyof typeof FILE_TYPE_MAPPING]
  }
  throw new Error(`Unsupported file type: ${mimeType}`)
}
