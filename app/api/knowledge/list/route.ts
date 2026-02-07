import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/knowledge/list
 *
 * List knowledge files for the authenticated user.
 *
 * Query params:
 * - status: 'pending' | 'indexing' | 'ready' | 'failed' (optional)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 *
 * Response:
 * - files: Array<{ id, name, fileType, fileSize, status, chunkCount, uploadedAt }>
 * - total: number
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('knowledge_files')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const files = (data || []).map((file) => ({
      id: file.id,
      name: file.name,
      fileType: file.file_type,
      fileSize: file.file_size,
      status: file.status,
      chunkCount: file.chunk_count,
      uploadedAt: file.created_at,
      lastIndexedAt: file.last_indexed_at,
    }))

    return NextResponse.json({
      files,
      total: count || 0,
    })
  } catch (error) {
    console.error('Knowledge list error:', error)
    return NextResponse.json(
      { error: 'Failed to list files', message: (error as Error).message },
      { status: 500 }
    )
  }
}
