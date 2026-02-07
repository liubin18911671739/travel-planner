import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage/helper'
import { EXPORT_SIGNED_URL_EXPIRES_IN } from '@/lib/storage/buckets'

type RouteContext = {
  params: Promise<{ id: string }>
}

type ArtifactRow = {
  id: string
  kind: string
  storage_bucket: string | null
  storage_path: string
}

/**
 * @deprecated Prefer /api/exports and /api/exports/artifacts/[id]/download
 *
 * GET /api/exports/:id
 * Compatibility endpoint: treat :id as itineraryId and return one export URL.
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: itineraryId } = await context.params

    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('id, export_url, status')
      .eq('id', itineraryId)
      .eq('user_id', user.id)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    const { data: artifacts } = await supabase
      .from('artifacts')
      .select('id, kind, storage_bucket, storage_path')
      .eq('itinerary_id', itineraryId)
      .order('created_at', { ascending: false })

    const artifactRows = (artifacts || []) as ArtifactRow[]
    const preferredArtifact =
      artifactRows.find((row) => row.kind === 'pdf') || artifactRows[0]

    if (preferredArtifact) {
      if (!preferredArtifact.storage_bucket) {
        return NextResponse.json(
          { error: 'Missing storage bucket' },
          { status: 400 }
        )
      }

      const normalizedBucket = preferredArtifact.storage_bucket.toUpperCase()
      if (
        normalizedBucket !== 'EXPORTS' &&
        normalizedBucket !== 'MERCH' &&
        normalizedBucket !== 'KNOWLEDGE'
      ) {
        return NextResponse.json(
          { error: 'Unsupported storage bucket' },
          { status: 400 }
        )
      }

      const url = await getSignedUrl(
        normalizedBucket as 'EXPORTS' | 'MERCH' | 'KNOWLEDGE',
        preferredArtifact.storage_path,
        EXPORT_SIGNED_URL_EXPIRES_IN
      )

      return NextResponse.json({
        deprecated: true,
        itineraryId,
        artifactId: preferredArtifact.id,
        kind: preferredArtifact.kind,
        url,
        expiresAt: new Date(
          Date.now() + EXPORT_SIGNED_URL_EXPIRES_IN * 1000
        ).toISOString(),
      })
    }

    const legacyExportUrl =
      typeof itinerary.export_url === 'string' ? itinerary.export_url : null

    if (!legacyExportUrl) {
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

    const legacyPath = legacyExportUrl.replace('exports/', '')
    const signedUrl = await getSignedUrl(
      'EXPORTS',
      legacyPath,
      EXPORT_SIGNED_URL_EXPIRES_IN
    )

    return NextResponse.json({
      deprecated: true,
      itineraryId,
      url: signedUrl,
      expiresAt: new Date(
        Date.now() + EXPORT_SIGNED_URL_EXPIRES_IN * 1000
      ).toISOString(),
    })
  } catch (error) {
    console.error('Export get error:', error)
    return NextResponse.json(
      { error: 'Failed to get export URL', message: (error as Error).message },
      { status: 500 }
    )
  }
}
