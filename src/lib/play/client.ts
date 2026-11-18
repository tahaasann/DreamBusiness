import { PlayApiError, playErrorFromResponse } from './errors'

const API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications'

/** Google's protobuf Timestamp as JSON. */
export interface PlayTimestamp {
    seconds?: string | number
    nanos?: number
}

/** The subset of the Android Publisher `Review` resource Proficios reads. */
export interface PlayReview {
    reviewId: string
    authorName?: string
    comments?: Array<{
        userComment?: {
            text?: string
            lastModified?: PlayTimestamp
            starRating?: number
            reviewerLanguage?: string
            device?: string
            androidOsVersion?: number
            appVersionCode?: number
            appVersionName?: string
            thumbsUpCount?: number
            deviceMetadata?: { productName?: string; manufacturer?: string }
        }
        developerComment?: {
            text?: string
            lastModified?: PlayTimestamp
        }
    }>
}

export interface PlayReviewPage {
    reviews: PlayReview[]
    nextPageToken: string | null
}

export interface PlayClientOptions {
    accessToken: string
    fetchImpl?: typeof fetch
}

async function call<T>(url: string, init: RequestInit, { accessToken, fetchImpl = fetch }: PlayClientOptions): Promise<T> {
    const request = () =>
        fetchImpl(url, {
            ...init,
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init.headers },
        })

    let response: Response
    try {
        response = await request()
        // One retry for Google's transient 5xx answers; never for 4xx.
        if (response.status >= 500) response = await request()
    } catch (error: unknown) {
        throw new PlayApiError('unavailable', null, error instanceof Error ? error.message : 'network error')
    }

    const body = await response.json().catch(() => null)
    if (!response.ok) throw playErrorFromResponse(response.status, body)
    return body as T
}

/** reviews.list: Play returns only reviews created or edited in the last 7 days. */
export async function listPlayReviews(
    packageName: string,
    { pageToken, maxResults = 100 }: { pageToken?: string | null; maxResults?: number },
    options: PlayClientOptions
): Promise<PlayReviewPage> {
    const params = new URLSearchParams({ maxResults: String(maxResults) })
    if (pageToken) params.set('token', pageToken)

    const body = await call<{ reviews?: PlayReview[]; tokenPagination?: { nextPageToken?: string } }>(
        `${API_BASE}/${encodeURIComponent(packageName)}/reviews?${params}`,
        { method: 'GET' },
        options
    )
    return {
        reviews: body?.reviews ?? [],
        nextPageToken: body?.tokenPagination?.nextPageToken ?? null,
    }
}

/** reviews.reply: creates or replaces the developer reply on Google Play. */
export async function replyToPlayReview(
    packageName: string,
    reviewId: string,
    replyText: string,
    options: PlayClientOptions
): Promise<{ replyText: string; lastEdited: string | null }> {
    const body = await call<{ result?: { replyText?: string; lastEdited?: PlayTimestamp } }>(
        `${API_BASE}/${encodeURIComponent(packageName)}/reviews/${encodeURIComponent(reviewId)}:reply`,
        { method: 'POST', body: JSON.stringify({ replyText }) },
        options
    )
    return {
        replyText: body?.result?.replyText ?? replyText,
        lastEdited: timestampToIso(body?.result?.lastEdited),
    }
}

export function timestampToIso(value: PlayTimestamp | undefined): string | null {
    if (!value || value.seconds === undefined) return null
    const seconds = Number(value.seconds)
    if (!Number.isFinite(seconds)) return null
    return new Date(seconds * 1000 + Math.floor((value.nanos ?? 0) / 1e6)).toISOString()
}
