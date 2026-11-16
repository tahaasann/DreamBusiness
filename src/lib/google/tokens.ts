import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret } from '@/lib/crypto/token-cipher'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const TOKEN_TABLE = 'google_oauth_tokens'
const EXPIRY_MARGIN_MS = 60_000
// Google access tokens live one hour. Supabase does not tell us when the one it
// returned was issued, so assume a little less.
const LOGIN_ACCESS_TOKEN_TTL_SECONDS = 50 * 60

export type GoogleTokenFailure = 'not_connected' | 'reconnect_required' | 'not_configured' | 'unavailable'

export type GoogleTokenResult =
    | { ok: true; accessToken: string }
    | { ok: false; reason: GoogleTokenFailure }

interface TokenRow {
    refresh_token_ciphertext: string
    access_token_ciphertext: string | null
    access_token_expires_at: string | null
}

/**
 * Called from /auth/callback right after a Google login. Supabase returns the
 * Google refresh token only at this moment and never refreshes provider tokens
 * itself, so we keep it (encrypted) to obtain new access tokens later.
 */
export async function storeGoogleTokens(
    userId: string,
    tokens: { accessToken?: string | null; refreshToken?: string | null }
): Promise<void> {
    if (!tokens.refreshToken) return

    const now = Date.now()
    const row: Record<string, unknown> = {
        user_id: userId,
        refresh_token_ciphertext: encryptSecret(tokens.refreshToken),
        access_token_ciphertext: tokens.accessToken ? encryptSecret(tokens.accessToken) : null,
        access_token_expires_at: tokens.accessToken
            ? new Date(now + LOGIN_ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString()
            : null,
        updated_at: new Date(now).toISOString(),
    }

    const { error } = await createAdminClient().from(TOKEN_TABLE).upsert(row, { onConflict: 'user_id' })
    if (error) {
        throw new Error(`Could not store Google tokens: ${error.message}`)
    }
}

/** Returns a valid Google access token for the user, refreshing it when needed. */
export async function getGoogleAccessToken(userId: string): Promise<GoogleTokenResult> {
    let supabase: ReturnType<typeof createAdminClient>
    try {
        supabase = createAdminClient()
    } catch {
        return { ok: false, reason: 'not_configured' }
    }

    const { data, error } = await supabase
        .from(TOKEN_TABLE)
        .select('refresh_token_ciphertext, access_token_ciphertext, access_token_expires_at')
        .eq('user_id', userId)
        .maybeSingle()

    if (error) {
        console.error('Google token lookup failed:', error.message)
        return { ok: false, reason: 'unavailable' }
    }
    const row = data as TokenRow | null
    if (!row) {
        return { ok: false, reason: 'not_connected' }
    }

    try {
        const expiresAt = row.access_token_expires_at ? Date.parse(row.access_token_expires_at) : 0
        if (row.access_token_ciphertext && expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
            return { ok: true, accessToken: decryptSecret(row.access_token_ciphertext) }
        }

        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
        if (!clientId || !clientSecret) {
            return { ok: false, reason: 'not_configured' }
        }

        const response = await fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: decryptSecret(row.refresh_token_ciphertext),
                grant_type: 'refresh_token',
            }),
        })
        const body = (await response.json().catch(() => ({}))) as {
            access_token?: string
            expires_in?: number
            refresh_token?: string
            error?: string
        }

        if (!response.ok || !body.access_token) {
            if (body.error === 'invalid_grant') {
                // The user revoked access or the token expired: forget it and ask them to reconnect.
                await supabase.from(TOKEN_TABLE).delete().eq('user_id', userId)
                return { ok: false, reason: 'reconnect_required' }
            }
            console.error('Google token refresh failed:', response.status, body.error)
            return { ok: false, reason: 'unavailable' }
        }

        const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 3600
        const update: Record<string, unknown> = {
            access_token_ciphertext: encryptSecret(body.access_token),
            access_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        }
        if (body.refresh_token) {
            update.refresh_token_ciphertext = encryptSecret(body.refresh_token)
        }
        const saved = await supabase.from(TOKEN_TABLE).update(update).eq('user_id', userId)
        if (saved.error) {
            // Not fatal: the token is valid, we will just refresh again next time.
            console.error('Could not cache refreshed Google token:', saved.error.message)
        }

        return { ok: true, accessToken: body.access_token }
    } catch (err: unknown) {
        console.error('Google token handling failed:', err)
        return { ok: false, reason: 'unavailable' }
    }
}

/**
 * Stored token first; the short-lived token from the current Supabase session is
 * only used when nothing is stored yet (e.g. a login from before this change).
 */
export async function resolveGoogleAccessToken(
    userId: string,
    sessionProviderToken?: string | null
): Promise<GoogleTokenResult> {
    const stored = await getGoogleAccessToken(userId)
    if (!stored.ok && stored.reason === 'not_connected' && sessionProviderToken) {
        return { ok: true, accessToken: sessionProviderToken }
    }
    return stored
}

export function googleTokenErrorMessage(reason: GoogleTokenFailure): string {
    switch (reason) {
        case 'not_connected':
        case 'reconnect_required':
            return 'Your Google connection has expired. Sign out and sign in with Google again to work with Google Maps.'
        case 'not_configured':
            return process.env.NODE_ENV === 'development'
                ? 'Google token storage is not configured. Set GOOGLE_TOKEN_ENCRYPTION_KEY, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and SUPABASE_SECRET_KEY.'
                : 'Google publishing is temporarily unavailable.'
        default:
            return 'Could not reach Google. Please try again shortly.'
    }
}
