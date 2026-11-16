import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client that uses the project's secret key and bypasses RLS.
 *
 * Use it only where there is no signed-in user and the request has been
 * authenticated by other means (e.g. a verified Paddle webhook signature).
 * Never import this from a client component; the `server-only` import makes
 * the build fail if that happens.
 */
export function createAdminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    // New-style secret key (sb_secret_…); the legacy service_role JWT also works.
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !secretKey) {
        throw new Error(
            'Supabase admin client is not configured: set SUPABASE_SECRET_KEY (server-only, no NEXT_PUBLIC_ prefix).'
        )
    }

    return createClient(url, secretKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    })
}
