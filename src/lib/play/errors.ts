/**
 * Failures from Google's token endpoint and the Android Publisher API, turned into
 * a small set of codes the UI can explain (task 2.05).
 */
export type PlayErrorCode =
    | 'invalid_key' // the service-account key was deleted, disabled or is malformed
    | 'api_disabled' // Google Play Android Developer API is not enabled in the Cloud project
    | 'no_permission' // the service account is not invited, or lacks "Reply to reviews"
    | 'app_not_found' // wrong package name, or the app is not in this developer account
    | 'quota' // Play's per-app hourly quota is used up
    | 'invalid_request' // e.g. reply text Play refuses
    | 'unavailable' // network error or a 5xx from Google

export class PlayApiError extends Error {
    readonly code: PlayErrorCode
    readonly status: number | null

    constructor(code: PlayErrorCode, status: number | null, detail?: string) {
        super(detail ? `${code}: ${detail}` : code)
        this.name = 'PlayApiError'
        this.code = code
        this.status = status
    }
}

interface GoogleErrorBody {
    error?:
        | string
        | {
              message?: string
              status?: string
              details?: Array<{ reason?: string }>
              errors?: Array<{ reason?: string }>
          }
    error_description?: string
}

/** Maps an Android Publisher API error response to a PlayApiError. */
export function playErrorFromResponse(status: number, body: unknown): PlayApiError {
    const parsed = (body ?? {}) as GoogleErrorBody
    const error = typeof parsed.error === 'object' ? parsed.error : undefined
    const message = error?.message ?? ''
    const reasons = [...(error?.details ?? []), ...(error?.errors ?? [])]
        .map((item) => item.reason ?? '')
        .join(' ')

    if (status === 403 && /SERVICE_DISABLED|accessNotConfigured/i.test(`${reasons} ${message}`)) {
        return new PlayApiError('api_disabled', status, message)
    }
    if (status === 401 || status === 403) return new PlayApiError('no_permission', status, message)
    if (status === 404) return new PlayApiError('app_not_found', status, message)
    if (status === 429) return new PlayApiError('quota', status, message)
    if (status >= 500) return new PlayApiError('unavailable', status, message)
    return new PlayApiError('invalid_request', status, message)
}

/** Maps an OAuth token endpoint failure (JWT bearer grant) to a PlayApiError. */
export function playErrorFromTokenResponse(status: number, body: unknown): PlayApiError {
    const parsed = (body ?? {}) as GoogleErrorBody
    const code = typeof parsed.error === 'string' ? parsed.error : ''
    const detail = parsed.error_description ?? code
    if (status >= 500) return new PlayApiError('unavailable', status, detail)
    // invalid_grant / invalid_client / unauthorized_client: the key no longer works.
    return new PlayApiError('invalid_key', status, detail)
}

const MESSAGES: Record<PlayErrorCode, string> = {
    invalid_key:
        'Google rejected the service-account key. It may have been deleted or disabled; create a new JSON key and upload it again.',
    api_disabled:
        'The Google Play Android Developer API is not enabled for this service account’s Cloud project. Enable it in Google Cloud Console, wait a few minutes, then try again.',
    no_permission:
        'The service account cannot reach this app. In Play Console → Users and permissions, invite it and give it the "Reply to reviews" permission for this app. New permissions can take up to 24 hours to apply.',
    app_not_found:
        'Google Play does not know this package name in your developer account. Check the package name (for example com.example.app).',
    quota: 'Google Play’s hourly limit for this app is used up. Try again in an hour.',
    invalid_request: 'Google Play did not accept the request.',
    unavailable: 'Could not reach Google Play. Please try again in a moment.',
}

export function playErrorMessage(code: PlayErrorCode): string {
    return MESSAGES[code]
}

export function toPlayApiError(error: unknown): PlayApiError {
    if (error instanceof PlayApiError) return error
    const detail = error instanceof Error ? error.message : String(error)
    return new PlayApiError('unavailable', null, detail)
}
