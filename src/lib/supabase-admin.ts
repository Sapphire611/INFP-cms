import { createClient } from '@supabase/supabase-js'
import { fetchWithTimeout } from './fetch-with-timeout'

/**
 * Creates a Supabase admin client with service role privileges.
 * This client bypasses Row Level Security (RLS) and should ONLY be used
 * in server-side code where you need full administrative access.
 *
 * IMPORTANT: Never expose this client to the browser or expose the service role key.
 * Use this only in API routes, server actions, or background jobs.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: fetchWithTimeout
    }
  }
)