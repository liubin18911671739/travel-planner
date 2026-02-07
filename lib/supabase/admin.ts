import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Supabase admin client with service role privileges.
 * Use this for server-side operations that bypass RLS policies.
 *
 * Note: This will throw at runtime if env vars are not set.
 * During build time, we use a lazy initialization pattern.
 */
let adminClient: SupabaseClient<Database> | null = null

export function getSupabaseAdmin() {
  if (!adminClient) {
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set')
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
    }

    adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return adminClient
}

/**
 * Direct access to the admin client (convenience).
 * Use getSupabaseAdmin() for lazy initialization.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseAdmin()
    return Reflect.get(client, prop)
  },
})
