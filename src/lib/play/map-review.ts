import { timestampToIso, type PlayReview } from './client'

/** One app_reviews row as written by the sync. user_id and app_id come from the app. */
export interface AppReviewRow {
    user_id: string
    app_id: string
    store_review_id: string
    author_name: string | null
    star_rating: number
    review_text: string | null
    reviewer_language: string | null
    app_version_code: number | null
    app_version_name: string | null
    device: string | null
    android_os_version: number | null
    thumbs_up_count: number
    review_updated_at: string | null
    /** Present only when Google Play already shows a developer reply. */
    developer_reply_text?: string
    developer_reply_updated_at?: string | null
    status?: 'replied'
}

const clip = (value: string | undefined | null, max: number): string | null => {
    const trimmed = value?.trim()
    return trimmed ? trimmed.slice(0, max) : null
}

const int = (value: unknown): number | null =>
    typeof value === 'number' && Number.isInteger(value) ? value : null

/**
 * Turns a Play review into a database row, or null when Play sent something
 * unusable (no id or no star rating). Lengths follow the table's CHECK limits.
 */
export function mapPlayReview(review: PlayReview, owner: { userId: string; appId: string }): AppReviewRow | null {
    const comments = review.comments ?? []
    const user = comments.find((comment) => comment.userComment)?.userComment
    const developer = comments.find((comment) => comment.developerComment)?.developerComment

    const rating = user?.starRating
    if (!review.reviewId || !user || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return null
    }

    const row: AppReviewRow = {
        user_id: owner.userId,
        app_id: owner.appId,
        store_review_id: review.reviewId.slice(0, 255),
        author_name: clip(review.authorName, 200),
        star_rating: Math.round(rating),
        // Play separates an optional title from the body with a tab.
        review_text: clip(user.text?.replace(/\t/g, '\n'), 10000),
        reviewer_language: clip(user.reviewerLanguage, 20),
        app_version_code: int(user.appVersionCode),
        app_version_name: clip(user.appVersionName, 100),
        device: clip(user.deviceMetadata?.productName ?? user.device, 200),
        android_os_version: int(user.androidOsVersion),
        thumbs_up_count: Math.max(0, int(user.thumbsUpCount) ?? 0),
        review_updated_at: timestampToIso(user.lastModified),
    }

    const replyText = clip(developer?.text, 350)
    if (replyText) {
        row.developer_reply_text = replyText
        row.developer_reply_updated_at = timestampToIso(developer?.lastModified)
        row.status = 'replied'
    }
    return row
}
