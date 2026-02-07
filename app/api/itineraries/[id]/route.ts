import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage/helper'
import { EXPORT_SIGNED_URL_EXPIRES_IN } from '@/lib/storage/buckets'

type RouteContext = {
  params: Promise<{ id: string }>
}

type ArtifactRow = {
  kind: string
  storage_bucket: string | null
  storage_path: string
  file_size: number | null
  created_at: string | null
}

type ItineraryRow = {
  id: string
  name: string
  destination: string
  duration_days: number
  content: unknown
  status: string
  gamma_deck_url: string | null
  settings: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

function isItineraryRow(value: unknown): value is ItineraryRow {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    typeof row.destination === 'string' &&
    typeof row.duration_days === 'number' &&
    typeof row.status === 'string' &&
    typeof row.created_at === 'string' &&
    typeof row.updated_at === 'string'
  )
}

/**
 * GET /api/itineraries/:id
 *
 * Get full itinerary details including artifacts.
 *
 * Response:
 * {
 *   id: string
 *   name: string
 *   destination: string
 *   durationDays: number
 *   content: { days: [...] }
 *   status: string
 *   gammaDeckUrl: string
 *   artifacts: [{ kind, url }]  // PDF, PPTX download links
 *   createdAt: string
 * }
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

    const { id: itineraryId } = await context.params

    // Get itinerary (ensure user owns it)
    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', itineraryId)
      .eq('user_id', user.id)
      .single()

    if (error || !itinerary || !isItineraryRow(itinerary)) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    // Get artifacts with signed URLs
    const { data: artifacts } = await supabase
      .from('artifacts')
      .select('*')
      .eq('itinerary_id', itineraryId)

    // Generate signed URLs for each artifact
    const artifactsWithUrls = await Promise.all(
      ((artifacts || []) as ArtifactRow[]).map(async (artifact) => {
        try {
          if (!artifact.storage_bucket) {
            throw new Error('Missing storage bucket')
          }

          const normalizedBucket = artifact.storage_bucket.toUpperCase()
          if (
            normalizedBucket !== 'EXPORTS' &&
            normalizedBucket !== 'MERCH' &&
            normalizedBucket !== 'KNOWLEDGE'
          ) {
            throw new Error('Unsupported storage bucket')
          }

          const url = await getSignedUrl(
            normalizedBucket as 'EXPORTS' | 'MERCH' | 'KNOWLEDGE',
            artifact.storage_path,
            EXPORT_SIGNED_URL_EXPIRES_IN
          )
          return {
            kind: artifact.kind,
            url,
            fileSize: artifact.file_size,
            createdAt: artifact.created_at || new Date(0).toISOString(),
          }
        } catch {
          return {
            kind: artifact.kind,
            url: null,
            fileSize: artifact.file_size,
            createdAt: artifact.created_at || new Date(0).toISOString(),
          }
        }
      })
    )

    return NextResponse.json({
      id: itinerary.id,
      name: itinerary.name,
      destination: itinerary.destination,
      durationDays: itinerary.duration_days,
      content: itinerary.content,
      status: itinerary.status,
      gammaDeckUrl: itinerary.gamma_deck_url,
      artifacts: artifactsWithUrls,
      settings: itinerary.settings,
      createdAt: itinerary.created_at,
      updatedAt: itinerary.updated_at,
    })
  } catch (error) {
    console.error('Itinerary get error:', error)
    return NextResponse.json(
      { error: 'Failed to get itinerary', message: (error as Error).message },
      { status: 500 }
    )
  }
}
