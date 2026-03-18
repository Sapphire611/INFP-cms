import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for browser-side operations.
 * This client is designed for use in Client Components.
 * It automatically handles localStorage and session management.
 */
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}