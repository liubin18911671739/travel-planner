import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  KnowledgePackUpdateRequestSchema,
  type ErrorResponse,
} from '@/lib/knowledge/schemas'

type RouteContext = {
  params: Promise<{ id: string }>
}

type KnowledgePackRecord = Record<string, unknown> & {
  file_ids?: string[]
}

/**
 * GET /api/knowledge/packs/[id]
 *
 * Get a specific knowledge pack by ID.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' } as ErrorResponse,
        { status: 401 }
      )
    }

    const { id: packId } = await context.params

    const { data: pack, error } = await supabase
      .from('knowledge_packs')
      .select('*')
      .eq('id', packId)
      .eq('user_id', user.id)
      .single()

    if (error || !pack) {
      return NextResponse.json(
        { error: 'Pack not found' } as ErrorResponse,
        { status: 404 }
      )
    }

    const packData = pack as KnowledgePackRecord
    const response = {
      pack: {
        ...packData,
        fileCount: packData.file_ids?.length || 0,
      },
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Knowledge pack get error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch pack',
        message: error instanceof Error ? error.message : String(error),
      } as ErrorResponse,
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/knowledge/packs/[id]
 *
 * Update a knowledge pack.
 *
 * Request body (all optional):
 * - name: string
 * - description: string
 * - fileIds: string[]
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' } as ErrorResponse,
        { status: 401 }
      )
    }

    const { id: packId } = await context.params

    // Verify pack exists and belongs to user
    const { data: existingPack, error: fetchError } = await supabase
      .from('knowledge_packs')
      .select('*')
      .eq('id', packId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingPack) {
      return NextResponse.json(
        { error: 'Pack not found' } as ErrorResponse,
        { status: 404 }
      )
    }

    const body = await request.json()
    const validationResult = KnowledgePackUpdateRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: validationResult.error.errors[0]?.message,
          details: validationResult.error.errors,
        } as ErrorResponse,
        { status: 400 }
      )
    }

    const updates: {
      name?: string
      description?: string
      file_ids?: string[]
    } = {}

    if (validationResult.data.name !== undefined) {
      updates.name = validationResult.data.name
    }

    if (validationResult.data.description !== undefined) {
      updates.description = validationResult.data.description
    }

    if (validationResult.data.fileIds !== undefined) {
      // Verify all files belong to the user
      const { data: files, error: filesError } = await supabase
        .from('knowledge_files')
        .select('id')
        .in('id', validationResult.data.fileIds)
        .eq('user_id', user.id)

      if (filesError) {
        return NextResponse.json(
          { error: 'Failed to verify files', message: filesError.message } as ErrorResponse,
          { status: 500 }
        )
      }

      const validFileIds = ((files as Array<{ id: unknown }> | null) || [])
        .map((f) => f.id)
        .filter((id): id is string => typeof id === 'string')

      if (validFileIds.length !== validationResult.data.fileIds.length) {
        return NextResponse.json(
          {
            error: 'Some files do not exist or do not belong to you',
          } as ErrorResponse,
          { status: 400 }
        )
      }

      updates.file_ids = validFileIds
    }

    // Update the pack
    const { data: pack, error: updateError } = await supabaseAdmin
      .from('knowledge_packs')
      .update(updates)
      .eq('id', packId)
      .select('*, file_ids')
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update pack', message: updateError.message } as ErrorResponse,
        { status: 500 }
      )
    }

    const packData = pack as KnowledgePackRecord
    const response = {
      pack: {
        ...packData,
        fileCount: packData.file_ids?.length || 0,
      },
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Knowledge pack update error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update pack',
        message: error instanceof Error ? error.message : String(error),
      } as ErrorResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge/packs/[id]
 *
 * Delete a knowledge pack.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' } as ErrorResponse,
        { status: 401 }
      )
    }

    const { id: packId } = await context.params

    // Verify pack exists and belongs to user
    const { data: existingPack, error: fetchError } = await supabase
      .from('knowledge_packs')
      .select('id')
      .eq('id', packId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingPack) {
      return NextResponse.json(
        { error: 'Pack not found' } as ErrorResponse,
        { status: 404 }
      )
    }

    // Delete the pack
    const { error: deleteError } = await supabaseAdmin
      .from('knowledge_packs')
      .delete()
      .eq('id', packId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete pack', message: deleteError.message } as ErrorResponse,
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Knowledge pack delete error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete pack',
        message: error instanceof Error ? error.message : String(error),
      } as ErrorResponse,
      { status: 500 }
    )
  }
}
