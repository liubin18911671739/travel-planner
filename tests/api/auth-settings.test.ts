import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { createBuilder } from '../mocks/postgrest'

const { createServerClientMock, supabaseAdminFromMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  supabaseAdminFromMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: supabaseAdminFromMock,
  },
}))

import { GET, PATCH } from '@/app/api/settings/route'

describe('GET/PATCH /api/settings', () => {
  it('returns 401 when user is not authenticated', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null } })),
      },
      from: vi.fn(),
    })

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns merged settings for authenticated user', async () => {
    const usersBuilder = createBuilder({
      single: {
        data: { id: 'user-1', settings: { brandName: '实验品牌' } },
        error: null,
      },
    })

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
      },
      from: vi.fn((table: string) => {
        if (table === 'users') return usersBuilder
        return createBuilder()
      }),
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.settings.brandName).toBe('实验品牌')
    expect(payload.settings.brandColor).toBe('#2c5aa0')
  })

  it('patches settings for authenticated user', async () => {
    const usersMaybeBuilder = createBuilder({
      maybeSingle: {
        data: { id: 'user-1' },
        error: null,
      },
    })

    const usersUpdateBuilder = createBuilder()

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(
          async () => ({ data: { user: { id: 'user-1', email: 'u@test.dev' } } })
        ),
      },
      from: vi.fn(),
    })

    supabaseAdminFromMock.mockImplementation((table: string) => {
      if (table === 'users') {
        if (supabaseAdminFromMock.mock.calls.length === 1) {
          return usersMaybeBuilder
        }
        return usersUpdateBuilder
      }
      return createBuilder()
    })

    const request = new NextRequest('http://localhost/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ brandName: '新品牌', notifications: false }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await PATCH(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.settings.brandName).toBe('新品牌')
    expect(payload.settings.notifications).toBe(false)
  })
})
