import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage/helper'
import { EXPORT_SIGNED_URL_EXPIRES_IN } from '@/lib/storage/buckets'

/**
 * GET /api/exports/:id
 *
 * Get a signed URL for downloading an exported file.
 *
 * Response:
 * {
 *   url: string (signed URL)
 *   expiresAt: string (ISO timestamp)
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
      .select('export_url, status')
      .eq('id', itineraryId)
      .eq('user_id', user.id)
      .single()

    if (error || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    if (!itinerary.export_url) {
      return NextResponse.json(
        { error: 'No export available for this itinerary' },
        { status: 404 }
      )
    }

    if (itinerary.status !== 'ready') {
      return NextResponse.json(
        { error: 'Itinerary is not ready for export' },
        { status: 400 }
      )
    }

    // Generate signed URL
    const storagePath = itinerary.export_url.replace('exports/', '')
    const signedUrl = await getSignedUrl(
      'EXPORTS',
      storagePath,
      EXPORT_SIGNED_URL_EXPIRES_IN
    )

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + EXPORT_SIGNED_URL_EXPIRES_IN * 1000).toISOString()

    return NextResponse.json({
      url: signedUrl,
      expiresAt,
    })
  } catch (error) {
    console.error('Export get error:', error)
    return NextResponse.json(
      { error: 'Failed to get export URL', message: (error as Error).message },
      { status: 500 }
    )
  }
}
