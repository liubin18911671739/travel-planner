import React from "react"
export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

export interface JobLog {
  id: string
  timestamp: string
  message: string
  level: 'info' | 'warning' | 'error'
}

export interface Job {
  id: string
  name: string
  status: JobStatus
  progress: number
  logs: JobLog[]
  createdAt: string
  updatedAt: string
}

export interface ItineraryItem {
  id: string
  day: number
  title: string
  description: string
  location?: string
  duration?: string
}

export type KnowledgeFileStatus = 'pending' | 'indexing' | 'ready' | 'failed'

export interface KnowledgeFile {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  status: KnowledgeFileStatus
  chunkCount?: number
  lastIndexedAt?: string
}

export interface KnowledgePack {
  id: string
  name: string
  description: string
  fileIds: string[]
  createdAt: string
}

/**
 * RAG retrieval result types.
 */
export interface RetrievedChunk {
  id: string
  fileId: string
  fileName?: string
  content: string
  metadata: Record<string, any>
  similarity: number
}

export interface Citation {
  chunkId: string
  fileId: string
  fileName: string
  similarity: number
}

export interface RAGSearchResult {
  query: string
  chunks: RetrievedChunk[]
  citations: Citation[]
  context?: string
}

export interface MerchandiseTemplate {
  id: string
  name: string
  category: string
  thumbnail?: string
}

/**
 * Merchandise (商品设计) types.
 */
export type MerchProductType = 'mug' | 'phone_case' | 'tshirt'
export type MerchStyleLock = 'flat' | 'vintage' | 'ink' | 'modern_minimal'
export type MerchDensity = 'sparse' | 'medium' | 'dense'
export type MerchColorMood = 'warm' | 'cool' | 'natural' | 'elegant' | 'vibrant'
export type MerchViewType = 'front' | 'side' | 'back' | 'context'

export type MerchDesignStatus = 'generating' | 'ready' | 'failed'

export interface MerchDesign {
  id: string
  user_id: string
  name: string
  product_type: MerchProductType
  theme_keywords: string[]
  color_mood: MerchColorMood
  density: MerchDensity
  style_lock: MerchStyleLock
  status: MerchDesignStatus
  pattern_storage_path?: string
  mockup_storage_paths?: string[]
  job_id?: string
  created_at?: string
  updated_at?: string
}

export interface MerchGenerateRequest {
  productType: MerchProductType
  size?: string
  themeKeywords: string[]
  colorMood: MerchColorMood
  density: MerchDensity
  styleLock: MerchStyleLock
  idempotencyKey?: string
}

export interface MerchGenerateResponse {
  designId: string
  jobId: string
  status: 'pending'
}

/**
 * Gamma presentation types.
 */
export type GammaExportFormat = 'pdf' | 'pptx'
export type GammaDeckStatus = 'processing' | 'ready' | 'failed'

export interface GammaSlideContent {
  title?: string
  content: string
  bullets?: string[]
  image?: string
}

export interface GammaDeck {
  deckId: string
  deckUrl: string
  editUrl?: string
}

export interface GammaExportResult {
  url: string
  format: GammaExportFormat
  buffer: Buffer
}

export interface TabItem {
  label: string
  value: string
  icon: React.ReactNode
  href: string
}
