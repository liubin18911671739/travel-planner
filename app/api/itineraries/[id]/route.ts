import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage/helper'
import { EXPORT_SIGNED_URL_EXPIRES_IN } from '@/lib/storage/buckets'

/**
 * GET /api/itineraries/:id
 *
 * Get full itinerary details.
 *
 * Response:
 * {
 *   id: string
 *   name: string
 *   destination: string
 *   durationDays: number
 *   content: { days: [...] }
 *   status: string
 *   exportUrl: string (signed URL)
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

    // Generate signed URL for export if exists
    let exportUrl = null
    if (itinerary.export_url) {
      // Convert storage path to signed URL
      try {
        // Assuming export_url is a storage path
        exportUrl = await getSignedUrl(
          'EXPORTS',
          itinerary.export_url.replace('exports/', ''),
          EXPORT_SIGNED_URL_EXPIRES_IN
        )
      } catch {
        // If signed URL fails, return the original URL
        exportUrl = itinerary.export_url
      }
    }

    return NextResponse.json({
      id: itinerary.id,
      name: itinerary.name,
      destination: itinerary.destination,
      durationDays: itinerary.duration_days,
      content: itinerary.content,
      status: itinerary.status,
      gammaDeckUrl: itinerary.gamma_deck_url,
      exportUrl,
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
