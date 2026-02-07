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

export interface MerchandiseTemplate {
  id: string
  name: string
  category: string
  thumbnail?: string
}

export interface TabItem {
  label: string
  value: string
  icon: React.ReactNode
  href: string
}
