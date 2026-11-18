import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlayAccessToken } from '@/lib/play/auth'
import { loadCredentialKey, recordCredentialStatus } from '@/lib/play/credentials'
import { toPlayApiError } from '@/lib/play/errors'
import { CRON_SKIP_IF_SYNCED_WITHIN_MS, msUntilNextSync } from '@/lib/play/quota'
import { syncPlayApp } from '@/lib/play/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Stop starting new apps after this long, so the function ends before maxDuration. */
const TIME_BUDGET_MS = 45_000

function isAuthorized(header: string | null): boolean {
    const secret = process.env.CRON_SECRET
    if (!secret || !header) return false
    const expected = Buffer.from(`Bearer ${secret}`)
    const given = Buffer.from(header)
    return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}

interface CronApp {
    id: string
    user_id: string
    package_name: string
    credential_id: string
    last_synced_at: string | null
}

/**
 * Scheduled Google Play sync (task 2.09). Vercel Cron calls it with
 * "Authorization: Bearer $CRON_SECRET". Apps synced by hand in the last 30 minutes
 * are skipped, and one access token is reused for all apps on the same key.
 */
export async function GET(request: Request) {
    if (!process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
    }
    if (!isAuthorized(request.headers.get('authorization'))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const started = Date.now()
    const admin = createAdminClient()
    const { data, error } = await admin
        .from('apps')
        .select('id, user_id, package_name, credential_id, last_synced_at')
        .eq('is_demo', false)
        .not('credential_id', 'is', null)
        .order('last_synced_at', { ascending: true, nullsFirst: true })
        .limit(500)
    if (error) {
        console.error('Cron: loading apps failed:', error.message)
        return NextResponse.json({ error: 'Loading apps failed' }, { status: 500 })
    }

    const apps = (data ?? []) as CronApp[]
    const tokens = new Map<string, string | null>()
    const summary = { apps: apps.length, synced: 0, skipped: 0, failed: 0, saved: 0, deferred: 0 }

    for (const app of apps) {
        if (Date.now() - started > TIME_BUDGET_MS) {
            summary.deferred += 1
            continue
        }
        if (msUntilNextSync(app.last_synced_at, Date.now(), CRON_SKIP_IF_SYNCED_WITHIN_MS) > 0) {
            summary.skipped += 1
            continue
        }

        const tokenKey = `${app.user_id}:${app.credential_id}`
        if (!tokens.has(tokenKey)) {
            try {
                const key = await loadCredentialKey(admin, app.credential_id, app.user_id)
                tokens.set(tokenKey, await getPlayAccessToken(key))
            } catch (tokenError: unknown) {
                const { code } = toPlayApiError(tokenError)
                if (code === 'invalid_key') {
                    await recordCredentialStatus(admin, app.credential_id, app.user_id, 'invalid_key')
                }
                tokens.set(tokenKey, null)
            }
        }
        const accessToken = tokens.get(tokenKey)
        if (!accessToken) {
            summary.failed += 1
            continue
        }

        const result = await syncPlayApp(admin, app, accessToken)
        if (result.ok) summary.synced += 1
        else summary.failed += 1
        summary.saved += result.saved
    }

    console.info('Cron sync-play:', JSON.stringify(summary))
    return NextResponse.json(summary)
}
