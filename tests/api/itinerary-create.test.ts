import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { createBuilder } from '../mocks/postgrest'

const {
  createServerClientMock,
  supabaseAdminFromMock,
  createJobMock,
  generateEventMock,
  checkQuotaMock,
  incrementQuotaMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  supabaseAdminFromMock: vi.fn(),
  createJobMock: vi.fn(),
  generateEventMock: vi.fn(),
  checkQuotaMock: vi.fn(),
  incrementQuotaMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: supabaseAdminFromMock,
  },
}))

vi.mock('@/lib/jobs/repository', () => ({
  jobRepository: {
    create: createJobMock,
  },
}))

vi.mock('@/lib/queue/client', () => ({
  inngestEvents: {
    itineraries: {
      generate: generateEventMock,
    },
  },
}))

vi.mock('@/lib/middleware/quota', () => ({
  checkQuota: checkQuotaMock,
  incrementQuota: incrementQuotaMock,
}))

import { POST } from '@/app/api/itineraries/create/route'

describe('POST /api/itineraries/create', () => {
  it('returns 400 for invalid destination', async () => {
    checkQuotaMock.mockResolvedValue({
      allowed: true,
      remaining: 10,
      limit: 10,
      used: 0,
    })

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
      },
      from: vi.fn(),
    })

    const request = new NextRequest('http://localhost/api/itineraries/create', {
      method: 'POST',
      body: JSON.stringify({ destination: 123, durationDays: 3 }),
      headers: { 'content-type': 'application/json' },
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('creates itinerary and dispatches generation job', async () => {
    const packBuilder = createBuilder({
      default: {
        data: [{ id: 'pack-1' }],
        error: null,
      },
    })

    const itineraryBuilder = createBuilder({
      single: {
        data: { id: 'itinerary-1' },
        error: null,
      },
    })

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
      },
      from: vi.fn((table: string) => {
        if (table === 'knowledge_packs') return packBuilder
        return createBuilder()
      }),
    })

    supabaseAdminFromMock.mockImplementation((table: string) => {
      if (table === 'itineraries') {
        return itineraryBuilder
      }
      return createBuilder()
    })

    checkQuotaMock.mockResolvedValue({
      allowed: true,
      remaining: 10,
      limit: 10,
      used: 0,
    })
    createJobMock.mockResolvedValue('job-1')
    generateEventMock.mockResolvedValue({ ids: ['evt-1'] })
    incrementQuotaMock.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/itineraries/create', {
      method: 'POST',
      body: JSON.stringify({
        destination: '北京',
        durationDays: 3,
        knowledgePackIds: ['pack-1'],
      }),
      headers: { 'content-type': 'application/json' },
    })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.jobId).toBe('job-1')
    expect(payload.status).toBe('pending')
    expect(generateEventMock).toHaveBeenCalled()
  })
})
