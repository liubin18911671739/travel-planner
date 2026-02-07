import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { createBuilder } from '../mocks/postgrest'

const { createServerClientMock, getSignedUrlMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('@/lib/storage/helper', () => ({
  getSignedUrl: getSignedUrlMock,
}))

import { GET } from '@/app/api/exports/artifacts/[id]/download/route'

describe('GET /api/exports/artifacts/[id]/download', () => {
  it('returns 401 for unauthenticated requests', async () => {
    createServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
      from: vi.fn(),
    })

    const request = new NextRequest('http://localhost/api/exports/artifacts/a-1/download')
    const response = await GET(request, { params: Promise.resolve({ id: 'a-1' }) })
    expect(response.status).toBe(401)
  })

  it('returns signed URL for existing artifact', async () => {
    const artifactBuilder = createBuilder({
      single: {
        data: {
          id: 'artifact-1',
          kind: 'pdf',
          storage_bucket: 'EXPORTS',
          storage_path: 'itineraries/i-1.pdf',
          itinerary_id: 'i-1',
          merch_design_id: null,
        },
        error: null,
      },
    })

    createServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
      from: vi.fn((table: string) => {
        if (table === 'artifacts') return artifactBuilder
        return createBuilder()
      }),
    })
    getSignedUrlMock.mockResolvedValue('https://signed.example/artifact-1')

    const request = new NextRequest('http://localhost/api/exports/artifacts/artifact-1/download')
    const response = await GET(request, {
      params: Promise.resolve({ id: 'artifact-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.artifactId).toBe('artifact-1')
    expect(payload.url).toBe('https://signed.example/artifact-1')
  })
})
