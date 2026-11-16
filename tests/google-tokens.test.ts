import crypto from 'crypto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret } from '@/lib/crypto/token-cipher'
import { getGoogleAccessToken, resolveGoogleAccessToken, storeGoogleTokens } from '@/lib/google/tokens'
import { createSupabaseMock } from './helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

const ENV_KEYS = ['GOOGLE_TOKEN_ENCRYPTION_KEY', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'] as const

describe('Google token storage', () => {
    const originalFetch = global.fetch
    const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

    beforeEach(() => {
        process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
        process.env.GOOGLE_OAUTH_CLIENT_ID = 'client-id.apps.googleusercontent.com'
        process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'client-secret'
        global.fetch = vi.fn()
    })

    afterEach(() => {
        global.fetch = originalFetch
        for (const key of ENV_KEYS) {
            if (originalEnv[key] === undefined) delete process.env[key]
            else process.env[key] = originalEnv[key]
        }
    })

    function useAdmin(row: Record<string, unknown> | null) {
        const mock = createSupabaseMock({ user: null, tables: { google_oauth_tokens: row } })
        vi.mocked(createAdminClient).mockReturnValue(mock.client as never)
        return mock
    }

    it('encrypts tokens so the stored value is not the token itself', () => {
        const stored = encryptSecret('1//refresh-token')

        expect(stored).not.toContain('refresh-token')
        expect(decryptSecret(stored)).toBe('1//refresh-token')
    })

    it('detects tampering with the stored ciphertext', () => {
        const [version, iv, tag, body] = encryptSecret('1//refresh-token').split(':')
        const flipped = Buffer.from(body, 'base64')
        flipped[0] ^= 0xff

        expect(() => decryptSecret([version, iv, tag, flipped.toString('base64')].join(':'))).toThrow()
    })

    it('stores the refresh token encrypted after login', async () => {
        const { calls } = useAdmin(null)

        await storeGoogleTokens('user_1', { accessToken: 'ya29.access', refreshToken: '1//refresh' })

        const row = calls.upserts[0].values as Record<string, string>
        expect(row.user_id).toBe('user_1')
        expect(row.refresh_token_ciphertext).not.toContain('refresh')
        expect(decryptSecret(row.refresh_token_ciphertext)).toBe('1//refresh')
    })

    it('reuses a cached access token that is still valid', async () => {
        useAdmin({
            refresh_token_ciphertext: encryptSecret('1//refresh'),
            access_token_ciphertext: encryptSecret('ya29.cached'),
            access_token_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
        })

        const result = await getGoogleAccessToken('user_1')

        expect(result).toEqual({ ok: true, accessToken: 'ya29.cached' })
        expect(global.fetch).not.toHaveBeenCalled()
    })

    it('refreshes an expired access token with the stored refresh token', async () => {
        const { calls } = useAdmin({
            refresh_token_ciphertext: encryptSecret('1//refresh'),
            access_token_ciphertext: encryptSecret('ya29.old'),
            access_token_expires_at: new Date(Date.now() - 60_000).toISOString(),
        })
        vi.mocked(global.fetch).mockResolvedValue(
            new Response(JSON.stringify({ access_token: 'ya29.new', expires_in: 3599 }), { status: 200 })
        )

        const result = await getGoogleAccessToken('user_1')

        expect(result).toEqual({ ok: true, accessToken: 'ya29.new' })
        const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
        expect(url).toBe('https://oauth2.googleapis.com/token')
        const params = new URLSearchParams(String(init.body))
        expect(params.get('grant_type')).toBe('refresh_token')
        expect(params.get('refresh_token')).toBe('1//refresh')
        const update = calls.updates[0].values as Record<string, string>
        expect(decryptSecret(update.access_token_ciphertext)).toBe('ya29.new')
    })

    it('forgets a revoked refresh token and asks the user to reconnect', async () => {
        const { calls } = useAdmin({
            refresh_token_ciphertext: encryptSecret('1//revoked'),
            access_token_ciphertext: null,
            access_token_expires_at: null,
        })
        vi.mocked(global.fetch).mockResolvedValue(
            new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
        )

        const result = await getGoogleAccessToken('user_1')

        expect(result).toEqual({ ok: false, reason: 'reconnect_required' })
        expect(calls.deletes).toEqual(['google_oauth_tokens'])
    })

    it('falls back to the session token only when nothing is stored', async () => {
        useAdmin(null)

        expect(await resolveGoogleAccessToken('user_1', 'ya29.session')).toEqual({
            ok: true,
            accessToken: 'ya29.session',
        })
        expect(await resolveGoogleAccessToken('user_1', null)).toEqual({ ok: false, reason: 'not_connected' })
    })

    it('reports missing configuration instead of crashing', async () => {
        vi.mocked(createAdminClient).mockImplementation(() => {
            throw new Error('SUPABASE_SECRET_KEY missing')
        })

        expect(await getGoogleAccessToken('user_1')).toEqual({ ok: false, reason: 'not_configured' })
    })
})
