import type { SupabaseClient } from '@supabase/supabase-js'

export type RateLimitBucket =
    | 'ai_draft'
    | 'publish_reply'
    | 'google_sync'
    | 'demo_branch'
    | 'play_sync'
    | 'play_connect'

export interface RateLimitRule {
    bucket: RateLimitBucket
    limit: number
    windowSeconds: number
}

/**
 * Per-user limits enforced in Postgres by public.consume_rate_limit()
 * (see supabase/migrations/20261118000200_play_data_model.sql). The bucket names
 * must match the allow-list inside that function.
 */
export const RATE_LIMITS = {
    aiDraft: { bucket: 'ai_draft', limit: 20, windowSeconds: 5 * 60 },
    publishReply: { bucket: 'publish_reply', limit: 60, windowSeconds: 10 * 60 },
    googleSync: { bucket: 'google_sync', limit: 5, windowSeconds: 10 * 60 },
    demoBranch: { bucket: 'demo_branch', limit: 5, windowSeconds: 60 * 60 },
    // Manual "Sync now": Play allows 200 review reads per app per hour.
    playSync: { bucket: 'play_sync', limit: 6, windowSeconds: 10 * 60 },
    // Service-account upload and package-name checks.
    playConnect: { bucket: 'play_connect', limit: 10, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>

export type RateLimitResult =
    | { allowed: true }
    | { allowed: false; reason: 'limited' | 'unavailable' }

/**
 * Fails closed: if the limiter cannot be reached (for example the SQL was not
 * applied yet) the action is refused instead of running without a limit.
 */
export async function consumeRateLimit(
    supabase: SupabaseClient,
    rule: RateLimitRule
): Promise<RateLimitResult> {
    const { data, error } = await supabase.rpc('consume_rate_limit', {
        p_bucket: rule.bucket,
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
    })

    if (error) {
        console.error(
            `Rate limiter unavailable for "${rule.bucket}". Apply supabase/manual/01_rate_limit.sql.`,
            error.message
        )
        return { allowed: false, reason: 'unavailable' }
    }

    return data === true ? { allowed: true } : { allowed: false, reason: 'limited' }
}

export function rateLimitMessage(reason: 'limited' | 'unavailable'): string {
    if (reason === 'limited') {
        return 'Too many requests. Please wait a few minutes and try again.'
    }

    return process.env.NODE_ENV === 'development'
        ? 'Rate limiter is not installed. Run supabase/manual/01_rate_limit.sql in the Supabase SQL Editor.'
        : 'This action is temporarily unavailable. Please try again shortly.'
}
