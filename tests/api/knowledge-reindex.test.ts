import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { createBuilder } from '../mocks/postgrest'

const { createServerClientMock, createJobMock, indexRequestedMock } = vi.hoisted(
  () => ({
    createServerClientMock: vi.fn(),
    createJobMock: vi.fn(),
    indexRequestedMock: vi.fn(),
  })
)

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('@/lib/jobs/repository', () => ({
  jobRepository: {
    create: createJobMock,
  },
}))

vi.mock('@/lib/queue/client', () => ({
  inngestEvents: {
    knowledge: {
      indexRequested: indexRequestedMock,
    },
  },
}))

import { POST } from '@/app/api/knowledge/[id]/reindex/route'

describe('POST /api/knowledge/[id]/reindex', () => {
  it('returns 401 for unauthenticated requests', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null } })),
      },
      from: vi.fn(),
    })

    const request = new NextRequest('http://localhost/api/knowledge/f-1/reindex', {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'f-1' }) })
    expect(response.status).toBe(401)
  })

  it('creates reindex job for owned file', async () => {
    const fileBuilder = createBuilder({
      single: {
        data: {
          id: 'file-1',
          name: 'doc.pdf',
          file_type: 'PDF',
          storage_path: 'files/doc.pdf',
          user_id: 'user-1',
        },
        error: null,
      },
    })

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
      },
      from: vi.fn((table: string) => {
        if (table === 'knowledge_files') return fileBuilder
        return createBuilder()
      }),
    })

    createJobMock.mockResolvedValue('job-1')
    indexRequestedMock.mockResolvedValue({ ids: ['evt-1'] })

    const request = new NextRequest('http://localhost/api/knowledge/file-1/reindex', {
      method: 'POST',
    })
    const response = await POST(request, {
      params: Promise.resolve({ id: 'file-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.jobId).toBe('job-1')
    expect(payload.fileId).toBe('file-1')
    expect(indexRequestedMock).toHaveBeenCalled()
  })
})
