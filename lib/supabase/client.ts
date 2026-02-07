'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let client: SupabaseClient<Database> | null = null

/**
 * Create a Supabase browser client for use in Client Components.
 * This is a singleton that maintains the session across requests.
 *
 * @returns Supabase client
 */
export function createClient() {
  if (!client) {
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set')
    }
    if (!supabaseAnonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set')
    }
    client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return client
}

/**
 * Get the Supabase browser client.
 * Convenience function that calls createClient().
 */
export function getSupabaseClient() {
  return createClient()
}
