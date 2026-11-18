import crypto from 'crypto'
import type { ServiceAccountKey } from './service-account'
import { PlayApiError, playErrorFromTokenResponse } from './errors'

export const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** Refresh a little before Google's expiry so a token never dies mid-request. */
const EXPIRY_MARGIN_MS = 60_000

interface CachedToken {
    accessToken: string
    expiresAt: number
}

// Per server instance. Keyed by the key id so a replaced key gets a fresh token.
const tokenCache = new Map<string, CachedToken>()

function base64url(input: Buffer | string): string {
    return Buffer.from(input).toString('base64url')
}

/** Signs the RS256 JWT for Google's service-account (JWT bearer) grant. */
export function buildServiceAccountAssertion(key: ServiceAccountKey, nowMs: number): string {
    const iat = Math.floor(nowMs / 1000)
    const header = { alg: 'RS256', typ: 'JWT', ...(key.privateKeyId ? { kid: key.privateKeyId } : {}) }
    const claims = {
        iss: key.clientEmail,
        scope: ANDROID_PUBLISHER_SCOPE,
        aud: TOKEN_URL,
        iat,
        exp: iat + 3600,
    }
    const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
    const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.privateKey)
    return `${unsigned}.${base64url(signature)}`
}

export interface AccessTokenOptions {
    fetchImpl?: typeof fetch
    now?: () => number
}

/**
 * Exchanges a service-account key for an Android Publisher access token
 * (task 2.01). Uses Google's documented JWT bearer flow directly, so no extra
 * dependency is needed.
 */
export async function getPlayAccessToken(
    key: ServiceAccountKey,
    { fetchImpl = fetch, now = Date.now }: AccessTokenOptions = {}
): Promise<string> {
    const cacheKey = `${key.clientEmail}:${key.privateKeyId ?? ''}`
    const cached = tokenCache.get(cacheKey)
    if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > now()) {
        return cached.accessToken
    }

    let response: Response
    try {
        response = await fetchImpl(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: buildServiceAccountAssertion(key, now()),
            }).toString(),
        })
    } catch (error: unknown) {
        throw new PlayApiError('unavailable', null, error instanceof Error ? error.message : 'network error')
    }

    const body = (await response.json().catch(() => null)) as
        | { access_token?: string; expires_in?: number }
        | null

    if (!response.ok || !body?.access_token) {
        tokenCache.delete(cacheKey)
        throw playErrorFromTokenResponse(response.status, body)
    }

    tokenCache.set(cacheKey, {
        accessToken: body.access_token,
        expiresAt: now() + (body.expires_in ?? 3600) * 1000,
    })
    return body.access_token
}

/** For tests and for when a key is replaced or removed. */
export function clearPlayTokenCache(): void {
    tokenCache.clear()
}
