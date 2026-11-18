'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth/require-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { consumeRateLimit, RATE_LIMITS, rateLimitMessage } from '@/lib/rate-limit'
import { DRAFT_TONES, REPLY_CHAR_LIMIT } from '@/lib/ai/draft-options'
import { recordEventReplyPublished } from '@/lib/metrics-tracker'
import { getPlayAccessToken } from '@/lib/play/auth'
import { listPlayReviews, replyToPlayReview } from '@/lib/play/client'
import { loadCredentialKey, recordCredentialStatus, saveCredential } from '@/lib/play/credentials'
import { playErrorMessage, toPlayApiError, type PlayErrorCode } from '@/lib/play/errors'
import { msUntilNextSync } from '@/lib/play/quota'
import { parseServiceAccount, serviceAccountProblemMessage } from '@/lib/play/service-account'
import { syncPlayApp } from '@/lib/play/sync'
import { APP_COLUMNS, REVIEW_COLUMNS, type AppItem, type CredentialItem, type ReviewItem } from '@/lib/play/types'

type Failure = { success: false; error: string; code?: PlayErrorCode }

const SIGN_IN_ERROR: Failure = { success: false, error: 'You need to sign in first.' }
const GENERIC_ERROR: Failure = { success: false, error: 'Something went wrong. Please try again.' }

type UserClient = Extract<Awaited<ReturnType<typeof requireUser>>, { ok: true }>['supabase']

/** Fresh app row and its reviews, so the dashboard can update without a reload. */
async function readAppState(supabase: UserClient, appId: string, userId: string) {
    const [app, reviews] = await Promise.all([
        supabase.from('apps').select(APP_COLUMNS).eq('id', appId).eq('user_id', userId).maybeSingle(),
        supabase
            .from('app_reviews')
            .select(REVIEW_COLUMNS)
            .eq('app_id', appId)
            .eq('user_id', userId)
            .order('review_updated_at', { ascending: false })
            .limit(1000),
    ])
    return {
        app: (app.data ?? null) as unknown as AppItem | null,
        reviews: (reviews.data ?? []) as unknown as ReviewItem[],
    }
}

function playFailure(error: unknown): Failure {
    const { code } = toPlayApiError(error)
    return { success: false, error: playErrorMessage(code), code }
}

// ── 2.02 + 2.03 · Connect a service account ──────────────────────────

export type ConnectPlayAccountResult =
    | { success: true; credentialId: string; serviceAccountEmail: string; credential: CredentialItem }
    | Failure

/**
 * Validates an uploaded service-account JSON, proves Google accepts it, then
 * stores it encrypted. The key itself never leaves the server again.
 */
export async function connectPlayAccount(serviceAccountJson: string): Promise<ConnectPlayAccountResult> {
    try {
        const auth = await requireUser()
        if (!auth.ok) return SIGN_IN_ERROR

        if (typeof serviceAccountJson !== 'string') {
            return { success: false, error: serviceAccountProblemMessage('not_json') }
        }
        const parsed = parseServiceAccount(serviceAccountJson)
        if (!parsed.ok) return { success: false, error: serviceAccountProblemMessage(parsed.problem) }

        const limit = await consumeRateLimit(auth.supabase, RATE_LIMITS.playConnect)
        if (!limit.allowed) return { success: false, error: rateLimitMessage(limit.reason) }

        try {
            await getPlayAccessToken(parsed.key)
        } catch (error: unknown) {
            return playFailure(error)
        }

        const { id } = await saveCredential(createAdminClient(), auth.user.id, parsed.key)
        return {
            success: true,
            credentialId: id,
            serviceAccountEmail: parsed.key.clientEmail,
            credential: {
                id,
                service_account_email: parsed.key.clientEmail,
                last_verified_at: new Date().toISOString(),
                last_error: null,
            },
        }
    } catch (error: unknown) {
        console.error('connectPlayAccount failed:', error)
        return GENERIC_ERROR
    }
}

// ── 2.04 · Add an app and check the package name ────────────────────

const AddAppSchema = z.object({
    credentialId: z.string().uuid(),
    packageName: z
        .string()
        .trim()
        .max(255)
        .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/, 'Enter a package name such as com.example.app.'),
    displayName: z.string().trim().min(1, 'Enter the app’s name.').max(100),
})

export type AddPlayAppResult =
    | {
          success: true
          appId: string
          app: AppItem | null
          reviews: ReviewItem[]
          initialSync: { ok: boolean; saved: number; error?: string }
      }
    | Failure

export async function addPlayApp(input: {
    credentialId: string
    packageName: string
    displayName: string
}): Promise<AddPlayAppResult> {
    try {
        const auth = await requireUser()
        if (!auth.ok) return SIGN_IN_ERROR
        const { supabase, user } = auth

        const parsed = AddAppSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid app details.' }
        }
        const { credentialId, packageName, displayName } = parsed.data

        const limit = await consumeRateLimit(supabase, RATE_LIMITS.playConnect)
        if (!limit.allowed) return { success: false, error: rateLimitMessage(limit.reason) }

        const admin = createAdminClient()
        let accessToken: string
        try {
            const key = await loadCredentialKey(admin, credentialId, user.id)
            accessToken = await getPlayAccessToken(key)
            // One cheap read proves both access and the package name.
            await listPlayReviews(packageName, { maxResults: 1 }, { accessToken })
        } catch (error: unknown) {
            const failure = playFailure(error)
            if (failure.code === 'invalid_key') {
                await recordCredentialStatus(admin, credentialId, user.id, 'invalid_key')
            }
            return failure
        }

        const { data: app, error } = await supabase
            .from('apps')
            .insert({
                user_id: user.id,
                credential_id: credentialId,
                platform: 'google_play',
                package_name: packageName,
                display_name: displayName,
            })
            .select('id, user_id, package_name')
            .single()
        if (error || !app) {
            if (error?.code === '23505') return { success: false, error: 'This app is already connected.' }
            console.error('Inserting app failed:', error)
            return GENERIC_ERROR
        }

        await recordCredentialStatus(admin, credentialId, user.id, null)

        // Best effort: fill the inbox right away. The app is saved either way.
        const sync = await syncPlayApp(supabase, app, accessToken)
        const state = await readAppState(supabase, app.id, user.id)
        return {
            success: true,
            appId: app.id,
            ...state,
            initialSync: sync.ok
                ? { ok: true, saved: sync.saved }
                : { ok: false, saved: sync.saved, error: playErrorMessage(sync.code) },
        }
    } catch (error: unknown) {
        console.error('addPlayApp failed:', error)
        return GENERIC_ERROR
    }
}

// ── 2.06 + 2.07 · Manual sync ───────────────────────────────────────

export type SyncPlayAppResult =
    | { success: true; fetched: number; saved: number; syncedAt: string; app: AppItem | null; reviews: ReviewItem[] }
    | (Failure & { retryInSeconds?: number; app?: AppItem | null })

export async function syncPlayAppNow(appId: string): Promise<SyncPlayAppResult> {
    try {
        const auth = await requireUser()
        if (!auth.ok) return SIGN_IN_ERROR
        const { supabase, user } = auth

        if (!z.string().uuid().safeParse(appId).success) return { success: false, error: 'App not found.' }

        const { data: app } = await supabase
            .from('apps')
            .select('id, user_id, package_name, credential_id, is_demo, last_synced_at')
            .eq('id', appId)
            .eq('user_id', user.id)
            .maybeSingle()
        if (!app) return { success: false, error: 'App not found.' }
        if (app.is_demo) return { success: false, error: 'The demo app has no Google Play connection.' }
        if (!app.credential_id) {
            return { success: false, error: 'Connect a Google Play service account for this app first.', code: 'invalid_key' }
        }

        const waitMs = msUntilNextSync(app.last_synced_at, Date.now())
        if (waitMs > 0) {
            const retryInSeconds = Math.ceil(waitMs / 1000)
            return {
                success: false,
                error: `This app was synced moments ago. Try again in ${retryInSeconds} seconds.`,
                retryInSeconds,
            }
        }

        const limit = await consumeRateLimit(supabase, RATE_LIMITS.playSync)
        if (!limit.allowed) return { success: false, error: rateLimitMessage(limit.reason) }

        const admin = createAdminClient()
        let accessToken: string
        try {
            accessToken = await getPlayAccessToken(await loadCredentialKey(admin, app.credential_id, user.id))
        } catch (error: unknown) {
            const failure = playFailure(error)
            if (failure.code === 'invalid_key') {
                await recordCredentialStatus(admin, app.credential_id, user.id, 'invalid_key')
            }
            return failure
        }

        const result = await syncPlayApp(supabase, app, accessToken)
        const state = await readAppState(supabase, app.id, user.id)
        if (!result.ok) {
            return { success: false, error: playErrorMessage(result.code), code: result.code, app: state.app }
        }
        return {
            success: true,
            fetched: result.fetched,
            saved: result.saved,
            syncedAt: new Date().toISOString(),
            ...state,
        }
    } catch (error: unknown) {
        console.error('syncPlayAppNow failed:', error)
        return GENERIC_ERROR
    }
}

// ── 2.08 · Publish a reply ──────────────────────────────────────────

const PublishSchema = z.object({
    reviewId: z.string().uuid(),
    replyText: z
        .string()
        .trim()
        .min(1, 'The reply cannot be empty.')
        .max(REPLY_CHAR_LIMIT, `Google Play allows at most ${REPLY_CHAR_LIMIT} characters.`),
    aiDraft: z.string().trim().min(1).max(2000),
    tone: z.enum(DRAFT_TONES),
    language: z.string().trim().min(2).max(20),
})

export type PublishPlayReplyResult =
    | { success: true; isEdited: boolean; publishedTo: 'google_play' | 'demo'; warning?: string }
    | Failure

/**
 * Sends the reply to Google Play first; only when Play accepts it is the review
 * marked as replied and the reply logged. Nothing is marked published otherwise.
 */
export async function publishPlayReply(input: {
    reviewId: string
    replyText: string
    aiDraft: string
    tone: string
    language: string
}): Promise<PublishPlayReplyResult> {
    try {
        const auth = await requireUser()
        if (!auth.ok) return SIGN_IN_ERROR
        const { supabase, user } = auth

        const parsed = PublishSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid reply.' }
        }
        const { reviewId, replyText, aiDraft, tone, language } = parsed.data

        const limit = await consumeRateLimit(supabase, RATE_LIMITS.publishReply)
        if (!limit.allowed) return { success: false, error: rateLimitMessage(limit.reason) }

        const { data: review } = await supabase
            .from('app_reviews')
            .select('id, store_review_id, app_id, apps!inner(id, package_name, credential_id, is_demo)')
            .eq('id', reviewId)
            .eq('user_id', user.id)
            .maybeSingle()
        const app = review?.apps as unknown as
            | { id: string; package_name: string; credential_id: string | null; is_demo: boolean }
            | undefined
        if (!review || !app) return { success: false, error: 'Review not found.' }

        let publishedAt = new Date().toISOString()
        if (!app.is_demo) {
            if (!app.credential_id) {
                return { success: false, error: 'Connect a Google Play service account for this app first.', code: 'invalid_key' }
            }
            const admin = createAdminClient()
            try {
                const accessToken = await getPlayAccessToken(await loadCredentialKey(admin, app.credential_id, user.id))
                const result = await replyToPlayReview(app.package_name, review.store_review_id, replyText, { accessToken })
                publishedAt = result.lastEdited ?? publishedAt
            } catch (error: unknown) {
                const failure = playFailure(error)
                if (failure.code === 'invalid_key') {
                    await recordCredentialStatus(admin, app.credential_id, user.id, 'invalid_key')
                }
                return { ...failure, error: `${failure.error} Nothing was published.` }
            }
        }

        const publishedTo = app.is_demo ? 'demo' : 'google_play'
        const isEdited = replyText !== aiDraft

        const update = await supabase
            .from('app_reviews')
            .update({ status: 'replied', developer_reply_text: replyText, developer_reply_updated_at: publishedAt })
            .eq('id', review.id)
            .eq('user_id', user.id)
        const log = await supabase.from('reply_logs').insert({
            user_id: user.id,
            review_id: review.id,
            tone,
            language,
            ai_draft: aiDraft,
            published_text: replyText,
            published_at: publishedAt,
        })

        const saveError = update.error ?? log.error
        if (saveError) {
            console.error('Saving reply history failed:', saveError)
            if (app.is_demo) return { success: false, error: 'Saving the demo reply failed. Please try again.' }
            return {
                success: true,
                isEdited,
                publishedTo,
                warning: 'The reply is live on Google Play, but saving it to your history failed.',
            }
        }

        await recordEventReplyPublished(isEdited)
        return { success: true, isEdited, publishedTo }
    } catch (error: unknown) {
        console.error('publishPlayReply failed:', error)
        return { success: false, error: 'Failed to publish the reply. Nothing was marked as published.' }
    }
}
