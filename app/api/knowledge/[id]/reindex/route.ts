import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { jobRepository } from '@/lib/jobs/repository'
import { inngestEvents } from '@/lib/queue/client'

type RouteContext = {
  params: Promise<{ id: string }>
}

type KnowledgeFileRow = {
  id: string
  name: string
  file_type: string
  storage_path: string
  user_id: string
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
    typeof row.storage_path === 'string' &&
    typeof row.user_id === 'string'
  )
}

/**
 * POST /api/knowledge/[id]/reindex
 *
 * Re-index an existing knowledge file.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await context.params

    const { data: file, error } = await supabase
      .from('knowledge_files')
      .select('id, name, file_type, storage_path, user_id')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (error || !file || !isKnowledgeFileRow(file)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const jobId = await jobRepository.create({
      userId: user.id,
      type: 'index_knowledge',
      input: {
        fileId: file.id,
        fileName: file.name,
        fileType: file.file_type,
        storagePath: file.storage_path,
        reindex: true,
      },
    })

    await inngestEvents.knowledge.indexRequested({
      jobId,
      fileId: file.id,
      userId: user.id,
    })

    return NextResponse.json({
      fileId: file.id,
      jobId,
      status: 'pending',
    })
  } catch (error) {
    console.error('Knowledge reindex error:', error)
    return NextResponse.json(
      { error: 'Failed to reindex file', message: (error as Error).message },
      { status: 500 }
    )
  }
}
