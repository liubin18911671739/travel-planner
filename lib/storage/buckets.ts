/**
 * Supabase Storage bucket names and path constants.
 */

export const BUCKETS = {
  KNOWLEDGE: 'knowledge',
  MERCH: 'merch',
  EXPORTS: 'exports',
} as const

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS]

/**
 * Default signed URL expiration time in seconds (1 hour).
 */
export const DEFAULT_SIGNED_URL_EXPIRES_IN = 3600

/**
 * Export signed URL expiration time (24 hours).
 */
export const EXPORT_SIGNED_URL_EXPIRES_IN = 86400

/**
 * Storage path prefixes.
 */
export const PATHS = {
  KNOWLEDGE: 'knowledge',
  MERCH_PATTERNS: 'merch/patterns',
  MERCH_MOCKUPS: 'merch/mockups',
  EXPORTS: 'exports',
} as const
