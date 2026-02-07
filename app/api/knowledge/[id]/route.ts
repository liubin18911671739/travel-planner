import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteFile } from '@/lib/storage/helper'

type RouteContext = {
  params: Promise<{ id: string }>
}

type KnowledgeFileRow = {
  id: string
  name: string
  file_type: string
  file_size: number | null
  status: string
  chunk_count: number | null
  created_at: string
  last_indexed_at: string | null
  metadata: Record<string, unknown> | null
}

type KnowledgeFileStorageRow = {
  storage_path: string
}

function isKnowledgeFileRow(value: unknown): value is KnowledgeFileRow {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    typeof row.file_type === 'string' &&
    (typeof row.file_size === 'number' || row.file_size === null) &&
    typeof row.status === 'string' &&
    (typeof row.chunk_count === 'number' || row.chunk_count === null) &&
    typeof row.created_at === 'string'
  )
}

function hasStoragePath(value: unknown): value is KnowledgeFileStorageRow {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const row = value as Record<string, unknown>
  return typeof row.storage_path === 'string'
}

/**
 * GET /api/knowledge/:id
 *
 * Get a single knowledge file by ID.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    // Get user from session
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await context.params

    // Get file (ensure user owns it)
    const { data: file, error } = await supabase
      .from('knowledge_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (error || !file || !isKnowledgeFileRow(file)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: file.id,
      name: file.name,
      fileType: file.file_type,
      fileSize: file.file_size ?? 0,
      status: file.status,
      chunkCount: file.chunk_count ?? 0,
      uploadedAt: file.created_at,
      lastIndexedAt: file.last_indexed_at,
      metadata: file.metadata,
    })
  } catch (error) {
    console.error('Knowledge get error:', error)
    return NextResponse.json(
      { error: 'Failed to get file', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge/:id
 *
 * Delete a knowledge file.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    // Get user from session
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await context.params

    // Get file (ensure user owns it)
    const { data: file, error: selectError } = await supabase
      .from('knowledge_files')
      .select('storage_path')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (selectError || !file || !hasStoragePath(file)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from storage
    await deleteFile('KNOWLEDGE', file.storage_path)

    // Delete from database (chunks will cascade delete)
    const { error: deleteError } = await supabaseAdmin
      .from('knowledge_files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Knowledge delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file', message: (error as Error).message },
      { status: 500 }
    )
  }
}
