import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

export type RequireUserResult =
    | { ok: true; supabase: ServerSupabaseClient; user: User }
    | { ok: false; supabase: ServerSupabaseClient; user: null }

/**
 * Every server action is a public POST endpoint. Call this first in each action
 * that touches user data, AI generation or external APIs.
 *
 * getUser() verifies the session with Supabase Auth instead of trusting the cookie.
 */
export async function requireUser(): Promise<RequireUserResult> {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        return { ok: false, supabase, user: null }
    }

    return { ok: true, supabase, user }
}
