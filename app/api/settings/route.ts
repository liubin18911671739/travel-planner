import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type UserSettings = {
  brandName: string
  brandColor: string
  notifications: boolean
  autoSave: boolean
}

const DEFAULT_SETTINGS: UserSettings = {
  brandName: '研学行程生成器',
  brandColor: '#2c5aa0',
  notifications: true,
  autoSave: true,
}

/**
 * GET /api/settings
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, settings')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    const userSettings =
      data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
        ? (data.settings as Partial<UserSettings>)
        : null

    return NextResponse.json({
      settings: {
        ...DEFAULT_SETTINGS,
        ...(userSettings || {}),
      },
    })
  } catch (error) {
    console.error('Settings get error:', error)
    return NextResponse.json(
      { error: 'Failed to get settings', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as Partial<UserSettings>
    const nextSettings: UserSettings = {
      brandName:
        typeof body.brandName === 'string' && body.brandName.trim()
          ? body.brandName.trim()
          : DEFAULT_SETTINGS.brandName,
      brandColor:
        typeof body.brandColor === 'string' && body.brandColor.trim()
          ? body.brandColor.trim()
          : DEFAULT_SETTINGS.brandColor,
      notifications:
        typeof body.notifications === 'boolean'
          ? body.notifications
          : DEFAULT_SETTINGS.notifications,
      autoSave:
        typeof body.autoSave === 'boolean'
          ? body.autoSave
          : DEFAULT_SETTINGS.autoSave,
    }

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!existingUser) {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email || `${user.id}@placeholder.local`,
          plan_tier: 'free',
          quota_used: 0,
          quota_limit: 10,
          settings: nextSettings,
        })

      if (insertError) {
        throw insertError
      }
    } else {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ settings: nextSettings })
        .eq('id', user.id)

      if (error) {
        throw error
      }
    }

    return NextResponse.json({ settings: nextSettings })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings', message: (error as Error).message },
      { status: 500 }
    )
  }
}
