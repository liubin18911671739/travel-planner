import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

/**
 * Create a Supabase server client for use in Next.js App Router.
 * This client respects RLS policies based on the user's session.
 *
 * @returns Supabase client with cookie-based auth
 */
export async function createServerClient() {
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set')
  }
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is not set')
  }

  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: SupabaseCookieOptions) {
        try {
          cookieStore.set({
            name,
            value,
            ...(options as Record<string, unknown>),
          })
        } catch {
          // In middleware, we can't set cookies
          // This is expected and handled by Supabase SSR
        }
      },
      remove(name: string, options: SupabaseCookieOptions) {
        try {
          cookieStore.set({
            name,
            value: '',
            ...(options as Record<string, unknown>),
          })
        } catch {
          // In middleware, we can't set cookies
        }
      },
    },
  })
}

/**
 * Get the current user from the server client.
 * Returns null if no authenticated session.
 */
export async function getCurrentUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}
type SupabaseCookieOptions = {
  [key: string]: unknown
}
