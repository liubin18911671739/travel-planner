import type { Database, Json } from '@/lib/supabase/database.types'

type PublicTables = Database['public']['Tables']

export type TableName = keyof PublicTables
export type TableRow<T extends TableName> = PublicTables[T]['Row']
export type TableInsert<T extends TableName> = PublicTables[T]['Insert']
export type TableUpdate<T extends TableName> = PublicTables[T]['Update']

export type JobRow = TableRow<'jobs'>
export type JobLogRow = TableRow<'job_logs'>
export type ItineraryRow = TableRow<'itineraries'>
export type KnowledgeFileRow = TableRow<'knowledge_files'>
export type KnowledgeChunkRow = TableRow<'knowledge_chunks'>
export type KnowledgePackRow = TableRow<'knowledge_packs'>
export type MerchDesignRow = TableRow<'merch_designs'>
export type ArtifactRow = TableRow<'artifacts'>
export type UserRow = TableRow<'users'>

export { type Json }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}
