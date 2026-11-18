/**
 * Google Play allows 200 reviews.list calls per app per hour (task 2.07).
 *
 * A sync reads at most MAX_PAGES_PER_SYNC pages, and the same app is synced at
 * most once per MIN_SYNC_INTERVAL_MS, so one app never spends more than
 * 5 × 30 = 150 calls an hour, leaving room for the add-app check and retries.
 * Play only returns reviews from the last 7 days, so 500 reviews per sync is
 * plenty for an indie app.
 */
export const MAX_PAGES_PER_SYNC = 5
export const REVIEWS_PER_PAGE = 100
export const MIN_SYNC_INTERVAL_MS = 2 * 60 * 1000

/** The cron skips apps a user synced by hand within this window. */
export const CRON_SKIP_IF_SYNCED_WITHIN_MS = 30 * 60 * 1000

/** Milliseconds until the app may be synced again (0 = now). */
export function msUntilNextSync(
    lastSyncedAt: string | null | undefined,
    nowMs: number,
    intervalMs: number = MIN_SYNC_INTERVAL_MS
): number {
    if (!lastSyncedAt) return 0
    const last = Date.parse(lastSyncedAt)
    if (Number.isNaN(last)) return 0
    return Math.max(0, last + intervalMs - nowMs)
}
