import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage/helper'
import {
  DEFAULT_SIGNED_URL_EXPIRES_IN,
  EXPORT_SIGNED_URL_EXPIRES_IN,
} from '@/lib/storage/buckets'

type RouteContext = {
  params: Promise<{ id: string }>
}

type ArtifactRow = {
  id: string
  kind: string
  storage_bucket: string | null
  storage_path: string
  itinerary_id: string | null
  merch_design_id: string | null
}

/**
 * GET /api/exports/artifacts/[id]/download
 *
 * Get download URL for an artifact.
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

    const { id: artifactId } = await context.params

    const { data, error } = await supabase
      .from('artifacts')
      .select('id, kind, storage_bucket, storage_path, itinerary_id, merch_design_id')
      .eq('id', artifactId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    const artifact = data as ArtifactRow
    if (!artifact.storage_bucket) {
      return NextResponse.json({ error: 'Missing storage bucket' }, { status: 400 })
    }
    const normalizedBucket = artifact.storage_bucket.toUpperCase()
    if (
      normalizedBucket !== 'KNOWLEDGE' &&
      normalizedBucket !== 'MERCH' &&
      normalizedBucket !== 'EXPORTS'
    ) {
      return NextResponse.json({ error: 'Unsupported storage bucket' }, { status: 400 })
    }
    const bucket = normalizedBucket as 'KNOWLEDGE' | 'MERCH' | 'EXPORTS'

    const expiresIn =
      bucket === 'EXPORTS'
        ? EXPORT_SIGNED_URL_EXPIRES_IN
        : DEFAULT_SIGNED_URL_EXPIRES_IN

    const url = await getSignedUrl(
      bucket,
      artifact.storage_path,
      expiresIn
    )

    return NextResponse.json({
      artifactId: artifact.id,
      kind: artifact.kind,
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Artifact download error:', error)
    return NextResponse.json(
      { error: 'Failed to create download URL', message: (error as Error).message },
      { status: 500 }
    )
  }
}
