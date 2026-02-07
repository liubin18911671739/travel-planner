import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

type ArtifactRow = {
  id: string
  kind: string
  storage_bucket: string | null
  storage_path: string
  file_size: number | null
  created_at: string | null
  itinerary_id: string | null
  merch_design_id: string | null
  itineraries: { id: string; name: string } | null
  merch_designs: { id: string; name: string } | null
}

/**
 * GET /api/exports
 *
 * Unified export list from artifacts.
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('artifacts')
      .select(
        `
          id,
          kind,
          storage_bucket,
          storage_path,
          file_size,
          created_at,
          itinerary_id,
          merch_design_id,
          itineraries:itinerary_id (id, name),
          merch_designs:merch_design_id (id, name)
        `
      )
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const items = ((data || []) as ArtifactRow[]).map((row) => ({
      artifactId: row.id,
      kind: row.kind,
      ownerType: row.itinerary_id ? 'itinerary' : 'merch',
      ownerId: row.itinerary_id || row.merch_design_id || '',
      ownerName: row.itinerary_id
        ? row.itineraries?.name || '未命名行程'
        : row.merch_designs?.name || '未命名设计',
      bucket: row.storage_bucket || 'EXPORTS',
      storagePath: row.storage_path,
      fileSize: row.file_size || 0,
      createdAt: row.created_at || new Date(0).toISOString(),
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Exports list error:', error)
    return NextResponse.json(
      { error: 'Failed to list exports', message: (error as Error).message },
      { status: 500 }
    )
  }
}
