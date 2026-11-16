export const DEFAULT_REDIRECT_PATH = '/dashboard'

// Any fixed origin works; it is only used to detect values that escape to another host.
const PROBE_ORIGIN = 'http://same-origin.invalid'

/**
 * Turns an untrusted `next` query value into a same-origin path.
 * Anything that would leave the site ("@evil.com", ".evil.com", "//evil.com",
 * "https://evil.com", tab/backslash tricks) falls back to the dashboard.
 */
export function safeRedirectPath(raw: string | null | undefined): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
        return DEFAULT_REDIRECT_PATH
    }

    try {
        // The URL parser removes tabs/newlines and normalises backslashes, so the
        // origin check below catches tricks the prefix checks above cannot see.
        const url = new URL(raw, PROBE_ORIGIN)
        if (url.origin !== PROBE_ORIGIN) {
            return DEFAULT_REDIRECT_PATH
        }
        return `${url.pathname}${url.search}${url.hash}`
    } catch {
        return DEFAULT_REDIRECT_PATH
    }
}

const HOSTNAME_PATTERN = /^[a-z0-9.-]+(?::\d{1,5})?$/i

/**
 * Base URL for the post-login redirect. Behind Vercel's proxy the public host is in
 * x-forwarded-host; it is only used when it looks like a plain host name.
 */
export function redirectBaseUrl(requestOrigin: string, forwardedHost: string | null): string {
    if (process.env.NODE_ENV === 'development' || !forwardedHost || !HOSTNAME_PATTERN.test(forwardedHost)) {
        return requestOrigin
    }
    return `https://${forwardedHost}`
}
