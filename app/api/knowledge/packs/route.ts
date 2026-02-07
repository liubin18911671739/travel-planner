import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  KnowledgePackCreateRequestSchema,
  type KnowledgePackListResponse,
  type KnowledgePackResponse,
  KnowledgePackUpdateRequestSchema,
  type ErrorResponse,
} from '@/lib/knowledge/schemas'

/**
 * GET /api/knowledge/packs
 *
 * List all knowledge packs for the authenticated user.
 *
 * Query params:
 * - limit: number (optional, default: 50)
 * - offset: number (optional, default: 0)
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Get total count
    const { count, error: countError } = await supabase
      .from('knowledge_packs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to count packs', message: countError.message } as ErrorResponse,
        { status: 500 }
      )
    }

    // Get packs with file counts
    const { data: packs, error } = await supabase
      .from('knowledge_packs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch packs', message: error.message } as ErrorResponse,
        { status: 500 }
      )
    }

    // Add file count to each pack
    const packsWithCounts = (packs || []).map((pack: any) => ({
      ...pack,
      fileCount: pack.file_ids?.length || 0,
    }))

    const response: KnowledgePackListResponse = {
      packs: packsWithCounts,
      total: count || 0,
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Knowledge packs list error:', error)
    return NextResponse.json(
      {
        error: 'Failed to list packs',
        message: error instanceof Error ? error.message : String(error),
      } as ErrorResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/knowledge/packs
 *
 * Create a new knowledge pack.
 *
 * Request body:
 * - name: string (required) - Pack name
 * - description: string (optional) - Pack description
 * - fileIds: string[] (required) - Array of file IDs to include
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validationResult = KnowledgePackCreateRequestSchema.safeParse(body)

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

    const { name, description, fileIds } = validationResult.data

    // Verify all files belong to the user
    const { data: files, error: filesError } = await supabase
      .from('knowledge_files')
      .select('id')
      .in('id', fileIds)
      .eq('user_id', user.id)

    if (filesError) {
      return NextResponse.json(
        { error: 'Failed to verify files', message: filesError.message } as ErrorResponse,
        { status: 500 }
      )
    }

    const validFileIds = (files || []).map((f: any) => f.id)

    if (validFileIds.length !== fileIds.length) {
      return NextResponse.json(
        {
          error: 'Some files do not exist or do not belong to you',
          details: { requested: fileIds, valid: validFileIds },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    // Create the pack using admin client (bypasses RLS for insert)
    const { data: pack, error: packError } = await supabaseAdmin
      .from('knowledge_packs')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        file_ids: validFileIds,
      } as any)
      .select()
      .single()

    if (packError) {
      return NextResponse.json(
        { error: 'Failed to create pack', message: packError.message } as ErrorResponse,
        { status: 500 }
      )
    }

    const response: KnowledgePackResponse = {
      pack: {
        ...(pack as any),
        fileCount: validFileIds.length,
      },
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Knowledge pack create error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create pack',
        message: error instanceof Error ? error.message : String(error),
      } as ErrorResponse,
      { status: 500 }
    )
  }
}
