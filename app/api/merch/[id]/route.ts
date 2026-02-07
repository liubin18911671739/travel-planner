import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage/helper'
import { DEFAULT_SIGNED_URL_EXPIRES_IN } from '@/lib/storage/buckets'

type RouteContext = {
  params: Promise<{ id: string }>
}

type MerchDesignRow = {
  id: string
  name: string
  product_type: string
  status: string
  pattern_storage_path: string | null
  mockup_storage_paths: string[] | null
  created_at: string
  updated_at: string
}

/**
 * GET /api/merch/[id]
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

    const { id } = await context.params
    const { data, error } = await supabase
      .from('merch_designs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 })
    }

    const design = data as MerchDesignRow

    let patternUrl: string | null = null
    if (design.pattern_storage_path) {
      patternUrl = await getSignedUrl(
        'MERCH',
        design.pattern_storage_path,
        DEFAULT_SIGNED_URL_EXPIRES_IN
      )
    }

    const mockupUrls = await Promise.all(
      (design.mockup_storage_paths || []).map(async (path) => ({
        storagePath: path,
        url: await getSignedUrl('MERCH', path, DEFAULT_SIGNED_URL_EXPIRES_IN),
      }))
    )

    return NextResponse.json({
      id: design.id,
      name: design.name,
      productType: design.product_type,
      status: design.status,
      pattern: design.pattern_storage_path
        ? { storagePath: design.pattern_storage_path, url: patternUrl }
        : null,
      mockups: mockupUrls,
      createdAt: design.created_at,
      updatedAt: design.updated_at,
    })
  } catch (error) {
    console.error('Merch detail error:', error)
    return NextResponse.json(
      { error: 'Failed to get merch detail', message: (error as Error).message },
      { status: 500 }
    )
  }
}
