import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

interface MetricDelta {
    activeStorefronts?: number
    totalDraftsGenerated?: number
    reviewsResponded?: number
    uneditedDraftsApproved?: number
}

/**
 * Public landing-page counters. Increments run in one atomic SQL statement
 * (public.increment_platform_metrics, see supabase/manual/04_platform_metrics.sql)
 * that only the server's secret key may execute, so visitors cannot change them
 * and concurrent requests do not lose updates.
 *
 * Metrics are best effort: a failure is logged and never breaks the user's action.
 */
async function incrementMetrics(delta: MetricDelta, label: string): Promise<void> {
    try {
        const { error } = await createAdminClient().rpc('increment_platform_metrics', {
            p_active_storefronts: delta.activeStorefronts ?? 0,
            p_total_drafts_generated: delta.totalDraftsGenerated ?? 0,
            p_reviews_responded: delta.reviewsResponded ?? 0,
            p_unedited_drafts_approved: delta.uneditedDraftsApproved ?? 0,
        })
        if (error) {
            console.error(`Failed to record ${label} metric:`, error.message)
        }
    } catch (err: unknown) {
        console.error(`Failed to record ${label} metric:`, err instanceof Error ? err.message : err)
    }
}

export async function recordEventBranchCreated() {
    await incrementMetrics({ activeStorefronts: 1 }, 'branch creation')
}

export async function recordEventDraftGenerated() {
    await incrementMetrics({ totalDraftsGenerated: 1 }, 'draft generation')
}

export async function recordEventReplyPublished(isEdited: boolean) {
    await incrementMetrics(
        { reviewsResponded: 1, uneditedDraftsApproved: isEdited ? 0 : 1 },
        'reply published'
    )
}
