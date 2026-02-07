import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { createBuilder } from '../mocks/postgrest'

const { createServerClientMock, getByIdWithLogsMock, getSignedUrlMock } =
  vi.hoisted(() => ({
    createServerClientMock: vi.fn(),
    getByIdWithLogsMock: vi.fn(),
    getSignedUrlMock: vi.fn(),
  }))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('@/lib/jobs/repository', () => ({
  jobRepository: {
    getByIdWithLogs: getByIdWithLogsMock,
  },
}))

vi.mock('@/lib/storage/helper', () => ({
  getSignedUrl: getSignedUrlMock,
}))

import { GET } from '@/app/api/merch/status/route'

describe('GET /api/merch/status', () => {
  it('returns 404 when job does not exist', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
      },
      from: vi.fn(),
    })
    getByIdWithLogsMock.mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost/api/merch/status?jobId=job-missing'
    )
    const response = await GET(request)
    expect(response.status).toBe(404)
  })

  it('returns signed preview URLs when job is done', async () => {
    const designBuilder = createBuilder({
      single: {
        data: {
          id: 'design-1',
          pattern_storage_path: 'merch/patterns/design-1.png',
          mockup_storage_paths: ['merch/mockups/design-1_front.png'],
        },
        error: null,
      },
    })

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
      },
      from: vi.fn((table: string) => {
        if (table === 'merch_designs') return designBuilder
        return createBuilder()
      }),
    })

    getByIdWithLogsMock.mockResolvedValue({
      id: 'job-1',
      userId: 'user-1',
      type: 'generate_merch',
      status: 'done',
      progress: 100,
      output: { designId: 'design-1' },
      logs: [],
      input: {},
      metadata: {},
      errorMessage: null,
      createdAt: '2026-02-07T00:00:00.000Z',
      updatedAt: '2026-02-07T00:00:00.000Z',
      startedAt: null,
      completedAt: null,
    })

    getSignedUrlMock.mockImplementation(
      async (_bucket: string, path: string) => `https://signed.example/${path}`
    )

    const request = new NextRequest('http://localhost/api/merch/status?jobId=job-1')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.result.patternUrl).toBe(
      'https://signed.example/merch/patterns/design-1.png'
    )
    expect(payload.result.mockupUrls).toEqual([
      'https://signed.example/merch/mockups/design-1_front.png',
    ])
  })
})
