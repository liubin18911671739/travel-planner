import { supabaseAdmin } from '@/lib/supabase/admin'
import { BUCKETS, DEFAULT_SIGNED_URL_EXPIRES_IN, EXPORT_SIGNED_URL_EXPIRES_IN } from './buckets'
import { randomUUID } from 'crypto'

/**
 * Custom error class for storage operations.
 */
export class StorageError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'StorageError'
  }
}

/**
 * Upload a file to Supabase Storage.
 *
 * @param bucket - Bucket name
 * @param path - Storage path (folder/filename.ext)
 * @param buffer - File buffer
 * @param contentType - MIME type
 * @param upsert - Whether to overwrite existing files
 * @returns The storage path
 */
export async function uploadFile(
  bucket: keyof typeof BUCKETS,
  path: string,
  buffer: Buffer,
  contentType: string,
  upsert: boolean = false
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .upload(path, buffer, {
      contentType,
      upsert,
    })

  if (error) {
    throw new StorageError(`Upload failed: ${error.message}`, error.message)
  }

  return path
}

/**
 * Upload a file with an auto-generated unique filename.
 *
 * @param bucket - Bucket name
 * @param folder - Folder path
 * @param filename - Original filename (for extension extraction)
 * @param buffer - File buffer
 * @param contentType - MIME type
 * @returns The full storage path
 */
export async function uploadFileWithUniqueName(
  bucket: keyof typeof BUCKETS,
  folder: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const ext = filename.includes('.') ? '.' + filename.split('.').pop() : ''
  const uniqueName = `${randomUUID()}${ext}`
  const path = folder ? `${folder}/${uniqueName}` : uniqueName

  return uploadFile(bucket, path, buffer, contentType)
}

/**
 * Get a signed URL for private file access.
 *
 * @param bucket - Bucket name
 * @param path - Storage path
 * @param expiresIn - Expiration time in seconds
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: keyof typeof BUCKETS,
  path: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRES_IN
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw new StorageError(`Failed to create signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Get a public URL for a file (bucket must be public).
 *
 * @param bucket - Bucket name
 * @param path - Storage path
 * @returns Public URL
 */
export function getPublicUrl(
  bucket: keyof typeof BUCKETS,
  path: string
): string {
  const { data } = supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Delete a file from storage.
 *
 * @param bucket - Bucket name
 * @param path - Storage path
 */
export async function deleteFile(
  bucket: keyof typeof BUCKETS,
  path: string
): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .remove([path])

  if (error) {
    throw new StorageError(`Delete failed: ${error.message}`)
  }
}

/**
 * Delete multiple files from storage.
 *
 * @param bucket - Bucket name
 * @param paths - Array of storage paths
 */
export async function deleteFiles(
  bucket: keyof typeof BUCKETS,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return

  const { error } = await supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .remove(paths)

  if (error) {
    throw new StorageError(`Batch delete failed: ${error.message}`)
  }
}

/**
 * Download a file from storage.
 *
 * @param bucket - Bucket name
 * @param path - Storage path
 * @returns File buffer and metadata
 */
export async function downloadFile(
  bucket: keyof typeof BUCKETS,
  path: string
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .download(path)

  if (error) {
    throw new StorageError(`Download failed: ${error.message}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return {
    buffer,
    contentType: data.type || null,
  }
}

/**
 * List files in a folder.
 *
 * @param bucket - Bucket name
 * @param folder - Folder path
 * @returns List of files
 */
export async function listFiles(
  bucket: keyof typeof BUCKETS,
  folder: string = ''
): Promise<Array<{ name: string; id: string }>> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .list(folder)

  if (error) {
    throw new StorageError(`List failed: ${error.message}`)
  }

  return data.map((file) => ({
    name: file.name,
    id: file.id,
  }))
}

/**
 * Copy a file within storage.
 *
 * @param bucket - Bucket name
 * @param sourcePath - Source path
 * @param destinationPath - Destination path
 */
export async function copyFile(
  bucket: keyof typeof BUCKETS,
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .copy(sourcePath, destinationPath)

  if (error) {
    throw new StorageError(`Copy failed: ${error.message}`)
  }
}

/**
 * Move a file within storage.
 *
 * @param bucket - Bucket name
 * @param sourcePath - Source path
 * @param destinationPath - Destination path
 */
export async function moveFile(
  bucket: keyof typeof BUCKETS,
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .move(sourcePath, destinationPath)

  if (error) {
    throw new StorageError(`Move failed: ${error.message}`)
  }
}

/**
 * Get file metadata.
 *
 * @param bucket - Bucket name
 * @param path - Storage path
 * @returns File metadata
 */
export async function getFileMetadata(
  bucket: keyof typeof BUCKETS,
  path: string
): Promise<{ size: number; lastModified: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKETS[bucket])
    .list(path.split('/').slice(0, -1).join('/'))

  if (error) {
    throw new StorageError(`Get metadata failed: ${error.message}`)
  }

  const file = data.find((f) => f.name === path.split('/').pop() || '')

  if (!file) {
    throw new StorageError('File not found')
  }

  return {
    size: file.metadata?.size || 0,
    lastModified: file.updated_at || file.created_at,
  }
}
