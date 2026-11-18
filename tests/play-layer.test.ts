import crypto from 'crypto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildServiceAccountAssertion, clearPlayTokenCache, getPlayAccessToken } from '@/lib/play/auth'
import { listPlayReviews, replyToPlayReview, type PlayReview } from '@/lib/play/client'
import { playErrorFromResponse, PlayApiError } from '@/lib/play/errors'
import { mapPlayReview } from '@/lib/play/map-review'
import { msUntilNextSync } from '@/lib/play/quota'
import { parseServiceAccount, type ServiceAccountKey } from '@/lib/play/service-account'
import { syncPlayApp } from '@/lib/play/sync'
import { createFakeDb } from './helpers/fake-db'
import {
    serviceAccountJson,
    TEST_CLIENT_EMAIL,
    TEST_PRIVATE_KEY_PEM as PEM,
    testPublicKey as publicKey,
} from './helpers/service-account'

const KEY: ServiceAccountKey = {
    clientEmail: TEST_CLIENT_EMAIL,
    privateKey: PEM,
    privateKeyId: 'kid123',
    projectId: 'proficios-test',
}

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('service-account JSON validator (2.02)', () => {
    it('accepts a real-looking key', () => {
        const result = parseServiceAccount(serviceAccountJson())
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.key.clientEmail).toBe(KEY.clientEmail)
            expect(result.key.privateKeyId).toBe('kid123')
        }
    })

    it.each([
        ['', 'empty'],
        ['{not json', 'not_json'],
        ['[1,2]', 'not_json'],
        [serviceAccountJson({ type: 'authorized_user' }), 'not_service_account'],
        [serviceAccountJson({ client_email: 'nope' }), 'missing_email'],
        [serviceAccountJson({ private_key: undefined }), 'missing_private_key'],
        [serviceAccountJson({ private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n' }), 'bad_private_key'],
        ['x'.repeat(20_000), 'too_large'],
    ])('rejects %#: %s', (raw, problem) => {
        expect(parseServiceAccount(raw)).toEqual({ ok: false, problem })
    })
})

describe('Google access token (2.01)', () => {
    beforeEach(() => clearPlayTokenCache())

    it('signs a JWT Google can verify, with the androidpublisher scope', () => {
        const now = Date.UTC(2026, 10, 18, 12)
        const [header, claims, signature] = buildServiceAccountAssertion(KEY, now).split('.')
        const decoded = JSON.parse(Buffer.from(claims, 'base64url').toString())

        expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toMatchObject({ alg: 'RS256', kid: 'kid123' })
        expect(decoded).toMatchObject({
            iss: KEY.clientEmail,
            scope: 'https://www.googleapis.com/auth/androidpublisher',
            aud: 'https://oauth2.googleapis.com/token',
            iat: now / 1000,
            exp: now / 1000 + 3600,
        })
        expect(
            crypto.verify('RSA-SHA256', Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, 'base64url'))
        ).toBe(true)
    })

    it('exchanges the JWT and caches the token until shortly before expiry', async () => {
        let now = 1_000_000
        const fetchImpl = vi.fn().mockResolvedValue(json(200, { access_token: 'ya29.token', expires_in: 3600 }))

        expect(await getPlayAccessToken(KEY, { fetchImpl, now: () => now })).toBe('ya29.token')
        now += 30 * 60 * 1000
        expect(await getPlayAccessToken(KEY, { fetchImpl, now: () => now })).toBe('ya29.token')
        expect(fetchImpl).toHaveBeenCalledTimes(1)

        const body = new URLSearchParams(fetchImpl.mock.calls[0][1].body as string)
        expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')

        now += 30 * 60 * 1000 // past expiry minus margin
        fetchImpl.mockResolvedValueOnce(json(200, { access_token: 'ya29.fresh', expires_in: 3600 }))
        expect(await getPlayAccessToken(KEY, { fetchImpl, now: () => now })).toBe('ya29.fresh')
    })

    it('reports a revoked or deleted key as invalid_key', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(json(400, { error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }))
        await expect(getPlayAccessToken(KEY, { fetchImpl })).rejects.toMatchObject({ code: 'invalid_key' })
    })

    it('reports network trouble as unavailable', async () => {
        const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
        await expect(getPlayAccessToken(KEY, { fetchImpl })).rejects.toMatchObject({ code: 'unavailable' })
    })
})

describe('Play error messages (2.05)', () => {
    it.each([
        [403, { error: { message: 'API not used', details: [{ reason: 'SERVICE_DISABLED' }] } }, 'api_disabled'],
        [403, { error: { message: 'The caller does not have permission' } }, 'no_permission'],
        [401, { error: { message: 'Request had invalid authentication credentials.' } }, 'no_permission'],
        [404, { error: { message: 'Package not found: com.x' } }, 'app_not_found'],
        [429, { error: { message: 'Quota exceeded' } }, 'quota'],
        [503, null, 'unavailable'],
        [400, { error: { message: 'Reply too long' } }, 'invalid_request'],
    ])('HTTP %i maps to %#', (status, body, code) => {
        expect(playErrorFromResponse(status, body).code).toBe(code)
    })
})

const userComment = (overrides: Record<string, unknown> = {}) => ({
    userComment: {
        text: 'Great app\tBut it crashes on Android 15',
        lastModified: { seconds: '1763460000', nanos: 500_000_000 },
        starRating: 2,
        reviewerLanguage: 'en',
        appVersionCode: 412,
        appVersionName: '4.1.2',
        androidOsVersion: 35,
        thumbsUpCount: 3,
        deviceMetadata: { productName: 'Pixel 9' },
        ...overrides,
    },
})

describe('review mapping', () => {
    const owner = { userId: 'user_a', appId: 'app_1' }

    it('maps the Play review fields to a row', () => {
        const row = mapPlayReview({ reviewId: 'gp:1', authorName: 'Ana', comments: [userComment()] }, owner)
        expect(row).toMatchObject({
            user_id: 'user_a',
            app_id: 'app_1',
            store_review_id: 'gp:1',
            author_name: 'Ana',
            star_rating: 2,
            review_text: 'Great app\nBut it crashes on Android 15',
            reviewer_language: 'en',
            app_version_code: 412,
            app_version_name: '4.1.2',
            device: 'Pixel 9',
            android_os_version: 35,
            thumbs_up_count: 3,
            review_updated_at: '2025-11-18T10:00:00.500Z',
        })
        expect(row).not.toHaveProperty('status')
    })

    it('marks reviews that already have a developer reply as replied', () => {
        const row = mapPlayReview(
            {
                reviewId: 'gp:2',
                comments: [userComment(), { developerComment: { text: 'Fixed in 4.1.3', lastModified: { seconds: 1763463600 } } }],
            },
            owner
        )
        expect(row).toMatchObject({ status: 'replied', developer_reply_text: 'Fixed in 4.1.3' })
    })

    it('skips reviews without an id or rating', () => {
        expect(mapPlayReview({ reviewId: '', comments: [userComment()] }, owner)).toBeNull()
        expect(mapPlayReview({ reviewId: 'gp:3', comments: [userComment({ starRating: 0 })] }, owner)).toBeNull()
        expect(mapPlayReview({ reviewId: 'gp:4' }, owner)).toBeNull()
    })
})

describe('Play client', () => {
    it('requests reviews for the package with paging and retries one 5xx', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(json(503, null))
            .mockResolvedValueOnce(json(200, { reviews: [{ reviewId: 'gp:1' }], tokenPagination: { nextPageToken: 'next' } }))

        const page = await listPlayReviews('com.fernly.app', { pageToken: 'abc', maxResults: 50 }, { accessToken: 't', fetchImpl })

        expect(page).toEqual({ reviews: [{ reviewId: 'gp:1' }], nextPageToken: 'next' })
        const [url, init] = fetchImpl.mock.calls[1]
        expect(url).toBe(
            'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.fernly.app/reviews?maxResults=50&token=abc'
        )
        expect(init.headers.Authorization).toBe('Bearer t')
    })

    it('does not retry 4xx answers', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(json(404, { error: { message: 'not found' } }))
        await expect(listPlayReviews('com.x.y', {}, { accessToken: 't', fetchImpl })).rejects.toBeInstanceOf(PlayApiError)
        expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it('posts the reply text to reviews:reply', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValue(json(200, { result: { replyText: 'Thanks!', lastEdited: { seconds: '1763460000' } } }))

        const result = await replyToPlayReview('com.fernly.app', 'gp:1', 'Thanks!', { accessToken: 't', fetchImpl })

        expect(fetchImpl.mock.calls[0][0]).toBe(
            'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.fernly.app/reviews/gp%3A1:reply'
        )
        expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ replyText: 'Thanks!' })
        expect(result).toEqual({ replyText: 'Thanks!', lastEdited: '2025-11-18T10:00:00.000Z' })
    })
})

describe('sync (2.06) and quota (2.07)', () => {
    const app = { id: 'app_1', user_id: 'user_a', package_name: 'com.fernly.app' }
    const review = (id: string, replied = false): PlayReview => ({
        reviewId: id,
        comments: replied ? [userComment(), { developerComment: { text: 'Thanks' } }] : [userComment()],
    })

    it('saves every page, keeps pending rows from overwriting a reply, and records the sync time', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(json(200, { reviews: [review('gp:1'), review('gp:2', true)], tokenPagination: { nextPageToken: 'p2' } }))
            .mockResolvedValueOnce(json(200, { reviews: [review('gp:3')] }))
        const db = createFakeDb()

        const result = await syncPlayApp(db.client as never, app, 'token', { fetchImpl })

        expect(result).toEqual({ ok: true, fetched: 3, saved: 3, pages: 2 })
        const upserts = db.find('app_reviews', 'upsert')
        expect(upserts.every((q) => (q.options as { onConflict: string }).onConflict === 'app_id,store_review_id')).toBe(true)
        const rows = upserts.flatMap((q) => q.values as Array<Record<string, unknown>>)
        expect(rows.find((r) => r.store_review_id === 'gp:2')).toMatchObject({ status: 'replied' })
        expect(rows.find((r) => r.store_review_id === 'gp:1')).not.toHaveProperty('status')
        expect(rows.find((r) => r.store_review_id === 'gp:1')).not.toHaveProperty('developer_reply_text')
        expect(db.find('apps', 'update')[0].values).toMatchObject({ last_sync_error: null })
    })

    it('stops after the page cap', async () => {
        const fetchImpl = vi.fn(async () => json(200, { reviews: [review('gp:x')], tokenPagination: { nextPageToken: 'more' } }))
        const result = await syncPlayApp(createFakeDb().client as never, app, 'token', { fetchImpl, maxPages: 5 })
        expect(fetchImpl).toHaveBeenCalledTimes(5)
        expect(result).toMatchObject({ ok: true, pages: 5 })
    })

    it('records a readable error when Play refuses', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(json(403, { error: { message: 'The caller does not have permission' } }))
        const db = createFakeDb()

        const result = await syncPlayApp(db.client as never, app, 'token', { fetchImpl })

        expect(result).toMatchObject({ ok: false, code: 'no_permission' })
        expect((db.find('apps', 'update')[0].values as { last_sync_error: string }).last_sync_error).toContain('Reply to reviews')
    })

    it('spaces out syncs of the same app', () => {
        const now = Date.parse('2026-11-18T12:00:00Z')
        expect(msUntilNextSync(null, now)).toBe(0)
        expect(msUntilNextSync('2026-11-18T11:59:30Z', now)).toBe(90_000)
        expect(msUntilNextSync('2026-11-18T11:50:00Z', now)).toBe(0)
    })
})

afterEach(() => vi.restoreAllMocks())
