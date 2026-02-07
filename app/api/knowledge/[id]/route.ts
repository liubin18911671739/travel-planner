import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteFile } from '@/lib/storage/helper'
import { BUCKETS } from '@/lib/storage/buckets'

/**
 * GET /api/knowledge/:id
 *
 * Get a single knowledge file by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const fileId = params.id

    // Get file (ensure user owns it)
    const { data: file, error } = await supabase
      .from('knowledge_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (error || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: file.id,
      name: file.name,
      fileType: file.file_type,
      fileSize: file.file_size,
      status: file.status,
      chunkCount: file.chunk_count,
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
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const fileId = params.id

    // Get file (ensure user owns it)
    const { data: file, error: selectError } = await supabase
      .from('knowledge_files')
      .select('storage_path')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (selectError || !file) {
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
