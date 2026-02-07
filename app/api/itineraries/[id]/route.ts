import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage/helper'
import { EXPORT_SIGNED_URL_EXPIRES_IN } from '@/lib/storage/buckets'

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

    const itineraryId = params.id

    // Get itinerary (ensure user owns it)
    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', itineraryId)
      .eq('user_id', user.id)
      .single()

    if (error || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    // Get artifacts with signed URLs
    const { data: artifacts } = await supabase
      .from('artifacts')
      .select('*')
      .eq('itinerary_id', itineraryId)

    // Generate signed URLs for each artifact
    const artifactsWithUrls = await Promise.all(
      (artifacts || []).map(async (artifact: any) => {
        try {
          const url = await getSignedUrl(
            artifact.storage_bucket,
            artifact.storage_path,
            EXPORT_SIGNED_URL_EXPIRES_IN
          )
          return {
            kind: artifact.kind,
            url,
            fileSize: artifact.file_size,
            createdAt: artifact.created_at,
          }
        } catch {
          return {
            kind: artifact.kind,
            url: null,
            fileSize: artifact.file_size,
            createdAt: artifact.created_at,
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
