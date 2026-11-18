import type { SupabaseClient } from '@supabase/supabase-js'
import { listPlayReviews } from './client'
import { mapPlayReview, type AppReviewRow } from './map-review'
import { MAX_PAGES_PER_SYNC, REVIEWS_PER_PAGE } from './quota'
import { playErrorMessage, toPlayApiError, type PlayErrorCode } from './errors'

export interface SyncableApp {
    id: string
    user_id: string
    package_name: string
}

export type SyncResult =
    | { ok: true; fetched: number; saved: number; pages: number }
    | { ok: false; code: PlayErrorCode; fetched: number; saved: number }

const CONFLICT_TARGET = 'app_id,store_review_id'

/**
 * Pulls the app's recent reviews from Google Play into app_reviews (task 2.06).
 *
 * Rows that already have a developer reply on Play are written with the reply and
 * status 'replied'. Rows without one are written WITHOUT status/reply columns, so a
 * reply published from Proficios moments ago is not reset to 'pending' while Play's
 * list catches up.
 */
export async function syncPlayApp(
    db: SupabaseClient,
    app: SyncableApp,
    accessToken: string,
    { fetchImpl, maxPages = MAX_PAGES_PER_SYNC }: { fetchImpl?: typeof fetch; maxPages?: number } = {}
): Promise<SyncResult> {
    let fetched = 0
    let saved = 0
    let pages = 0
    let pageToken: string | null = null
    let failure: PlayErrorCode | null = null

    try {
        do {
            const page = await listPlayReviews(
                app.package_name,
                { pageToken, maxResults: REVIEWS_PER_PAGE },
                { accessToken, fetchImpl }
            )
            pages += 1
            fetched += page.reviews.length

            const rows = page.reviews
                .map((review) => mapPlayReview(review, { userId: app.user_id, appId: app.id }))
                .filter((row): row is AppReviewRow => row !== null)
            saved += await saveRows(db, rows)
            pageToken = page.nextPageToken
        } while (pageToken && pages < maxPages)
    } catch (error: unknown) {
        failure = toPlayApiError(error).code
    }

    const { error: appError } = await db
        .from('apps')
        .update(
            failure
                ? { last_sync_error: playErrorMessage(failure).slice(0, 500) }
                : { last_synced_at: new Date().toISOString(), last_sync_error: null }
        )
        .eq('id', app.id)
        .eq('user_id', app.user_id)
    if (appError) console.error('Recording sync status failed:', appError.message)

    return failure ? { ok: false, code: failure, fetched, saved } : { ok: true, fetched, saved, pages }
}

async function saveRows(db: SupabaseClient, rows: AppReviewRow[]): Promise<number> {
    const replied = rows.filter((row) => row.status === 'replied')
    const pending = rows
        .filter((row) => row.status !== 'replied')
        .map((row) => {
            const copy = { ...row }
            delete copy.status
            delete copy.developer_reply_text
            delete copy.developer_reply_updated_at
            return copy
        })

    let count = 0
    for (const batch of [replied, pending]) {
        if (batch.length === 0) continue
        const { error } = await db.from('app_reviews').upsert(batch, { onConflict: CONFLICT_TARGET })
        if (error) throw new Error(`Saving reviews failed: ${error.message}`)
        count += batch.length
    }
    return count
}
