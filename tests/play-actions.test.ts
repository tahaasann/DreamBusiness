import crypto from 'crypto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addPlayApp, connectPlayAccount, publishPlayReply, syncPlayAppNow } from '@/app/actions/play'
import { GET as cronSyncPlay } from '@/app/api/cron/sync-play/route'
import { decryptSecret, encryptSecret } from '@/lib/crypto/token-cipher'
import { clearPlayTokenCache } from '@/lib/play/auth'
import { createFakeDb, type Responder } from './helpers/fake-db'
import { serviceAccountJson } from './helpers/service-account'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/metrics-tracker', () => ({ recordEventReplyPublished: vi.fn() }))

const CRED_ID = '11111111-1111-4111-8111-111111111111'
const APP_ID = '22222222-2222-4222-8222-222222222222'
const REVIEW_ID = '33333333-3333-4333-8333-333333333333'

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

type Route = (url: string, init?: RequestInit) => Response
function routeFetch(routes: { token?: Route; list?: Route; reply?: Route }) {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input)
        if (url.startsWith('https://oauth2.googleapis.com/token')) {
            return (routes.token ?? (() => json(200, { access_token: 'ya29.test', expires_in: 3600 })))(url, init)
        }
        if (url.endsWith(':reply')) return (routes.reply ?? (() => json(200, { result: { replyText: 'ok' } })))(url, init)
        if (url.includes('/reviews?')) return (routes.list ?? (() => json(200, { reviews: [] })))(url, init)
        throw new Error(`Unexpected fetch ${url}`)
    })
    global.fetch = fetchMock as unknown as typeof fetch
    return fetchMock
}

function storedCredentialRow() {
    return { encrypted_key: encryptSecret(serviceAccountJson(), 'CREDENTIALS_ENCRYPTION_KEY') }
}

function useClients(user: Record<string, Responder> = {}, admin: Record<string, Responder> = {}) {
    const userDb = createFakeDb(user)
    const adminDb = createFakeDb(admin, null)
    vi.mocked(createClient).mockResolvedValue(userDb.client as never)
    vi.mocked(createAdminClient).mockReturnValue(adminDb.client as never)
    return { userDb, adminDb }
}

describe('Play server actions', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
        process.env.CREDENTIALS_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
        clearPlayTokenCache()
    })
    afterEach(() => {
        global.fetch = originalFetch
        delete process.env.CREDENTIALS_ENCRYPTION_KEY
        delete process.env.CRON_SECRET
        vi.clearAllMocks()
    })

    describe('connectPlayAccount (2.02, 2.03)', () => {
        it('refuses a file that is not a service-account key before calling Google', async () => {
            const { userDb } = useClients()
            const fetchMock = routeFetch({})

            const result = await connectPlayAccount('{"type":"authorized_user"}')

            expect(result).toMatchObject({ success: false, error: expect.stringContaining('not a service-account key') })
            expect(fetchMock).not.toHaveBeenCalled()
            expect(userDb.client.rpc).not.toHaveBeenCalled()
        })

        it('stores the key encrypted once Google accepts it', async () => {
            const { adminDb } = useClients({}, { store_credentials: () => ({ data: { id: CRED_ID } }) })
            routeFetch({})

            const result = await connectPlayAccount(serviceAccountJson())

            expect(result).toMatchObject({
                success: true,
                credentialId: CRED_ID,
                serviceAccountEmail: 'replies@proficios-test.iam.gserviceaccount.com',
                credential: { id: CRED_ID, last_error: null },
            })
            // The dashboard gets metadata only, never the key.
            expect(JSON.stringify(result)).not.toContain('PRIVATE KEY')
            const row = adminDb.find('store_credentials', 'upsert')[0].values as Record<string, string>
            expect(row.user_id).toBe('user_a')
            expect(row.encrypted_key).not.toContain('PRIVATE KEY')
            expect(decryptSecret(row.encrypted_key, 'CREDENTIALS_ENCRYPTION_KEY')).toContain('PRIVATE KEY')
        })

        it('does not store a key Google rejects', async () => {
            const { adminDb } = useClients()
            routeFetch({ token: () => json(400, { error: 'invalid_grant' }) })

            const result = await connectPlayAccount(serviceAccountJson())

            expect(result).toMatchObject({ success: false, code: 'invalid_key' })
            expect(adminDb.find('store_credentials', 'upsert')).toHaveLength(0)
        })

        it('requires a signed-in user', async () => {
            vi.mocked(createClient).mockResolvedValue(createFakeDb({}, null).client as never)
            expect(await connectPlayAccount(serviceAccountJson())).toMatchObject({ success: false })
        })
    })

    describe('addPlayApp (2.04, 2.05)', () => {
        const input = { credentialId: CRED_ID, packageName: 'com.fernly.app', displayName: 'Fernly' }

        it('explains a wrong package name and saves nothing', async () => {
            const { userDb } = useClients({}, { store_credentials: () => ({ data: storedCredentialRow() }) })
            routeFetch({ list: () => json(404, { error: { message: 'Package not found' } }) })

            const result = await addPlayApp(input)

            expect(result).toMatchObject({ success: false, code: 'app_not_found' })
            expect(userDb.find('apps', 'insert')).toHaveLength(0)
        })

        it('adds the app after a successful check and runs a first sync', async () => {
            const { userDb } = useClients(
                { apps: (q) => (q.op === 'insert' ? { data: { id: APP_ID, user_id: 'user_a', package_name: 'com.fernly.app' } } : {}) },
                { store_credentials: () => ({ data: storedCredentialRow() }) }
            )
            const fetchMock = routeFetch({
                list: () => json(200, { reviews: [{ reviewId: 'gp:1', comments: [{ userComment: { starRating: 5, text: 'Love it' } }] }] }),
            })

            const result = await addPlayApp(input)

            expect(result).toMatchObject({ success: true, appId: APP_ID, initialSync: { ok: true, saved: 1 } })
            expect(userDb.find('apps', 'insert')[0].values).toMatchObject({ credential_id: CRED_ID, package_name: 'com.fernly.app' })
            // One maxResults=1 call checks access before saving; the first sync reads full pages.
            const listUrls = fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/reviews?'))
            expect(listUrls[0]).toContain('maxResults=1')
            expect(listUrls[1]).toContain('maxResults=100')
        })

        it('rejects a malformed package name without calling Google', async () => {
            useClients()
            const fetchMock = routeFetch({})
            expect(await addPlayApp({ ...input, packageName: 'fernly' })).toMatchObject({ success: false })
            expect(fetchMock).not.toHaveBeenCalled()
        })
    })

    describe('syncPlayAppNow (2.07)', () => {
        it('asks the user to wait when the app was just synced', async () => {
            useClients({
                apps: () => ({
                    data: {
                        id: APP_ID,
                        user_id: 'user_a',
                        package_name: 'com.fernly.app',
                        credential_id: CRED_ID,
                        is_demo: false,
                        last_synced_at: new Date(Date.now() - 30_000).toISOString(),
                    },
                }),
            })
            const fetchMock = routeFetch({})

            const result = await syncPlayAppNow(APP_ID)

            expect(result).toMatchObject({ success: false, retryInSeconds: expect.any(Number) })
            expect(fetchMock).not.toHaveBeenCalled()
        })
    })

    describe('publishPlayReply (2.08)', () => {
        const reply = { reviewId: REVIEW_ID, replyText: 'Fixed in 4.1.3, thanks!', aiDraft: 'Thanks!', tone: 'friendly', language: 'en' }
        const reviewRow = (isDemo = false) => ({
            data: {
                id: REVIEW_ID,
                store_review_id: 'gp:1',
                app_id: APP_ID,
                apps: { id: APP_ID, package_name: 'com.fernly.app', credential_id: isDemo ? null : CRED_ID, is_demo: isDemo },
            },
        })

        it('refuses replies longer than Google Play allows', async () => {
            useClients()
            const result = await publishPlayReply({ ...reply, replyText: 'x'.repeat(351) })
            expect(result).toMatchObject({ success: false, error: expect.stringContaining('350') })
        })

        it('marks nothing as published when Play refuses', async () => {
            const { userDb } = useClients({ app_reviews: () => reviewRow() }, { store_credentials: () => ({ data: storedCredentialRow() }) })
            routeFetch({ reply: () => json(403, { error: { message: 'The caller does not have permission' } }) })

            const result = await publishPlayReply(reply)

            expect(result).toMatchObject({ success: false, code: 'no_permission', error: expect.stringContaining('Nothing was published') })
            expect(userDb.find('app_reviews', 'update')).toHaveLength(0)
            expect(userDb.find('reply_logs', 'insert')).toHaveLength(0)
        })

        it('publishes to Play, then marks the review replied and logs it', async () => {
            const { userDb } = useClients({ app_reviews: () => reviewRow() }, { store_credentials: () => ({ data: storedCredentialRow() }) })
            const fetchMock = routeFetch({})

            const result = await publishPlayReply(reply)

            expect(result).toEqual({ success: true, isEdited: true, publishedTo: 'google_play' })
            const sent = fetchMock.mock.calls.find(([url]) => String(url).endsWith(':reply'))
            expect(JSON.parse(String(sent?.[1]?.body))).toEqual({ replyText: reply.replyText })
            expect(userDb.find('app_reviews', 'update')[0].values).toMatchObject({ status: 'replied', developer_reply_text: reply.replyText })
            expect(userDb.find('reply_logs', 'insert')[0].values).toMatchObject({
                user_id: 'user_a',
                review_id: REVIEW_ID,
                ai_draft: 'Thanks!',
                published_text: reply.replyText,
            })
        })

        it('never contacts Google for the demo app', async () => {
            useClients({ app_reviews: () => reviewRow(true) })
            const fetchMock = routeFetch({})

            expect(await publishPlayReply(reply)).toMatchObject({ success: true, publishedTo: 'demo' })
            expect(fetchMock).not.toHaveBeenCalled()
        })
    })
})

describe('cron /api/cron/sync-play (2.09)', () => {
    const originalFetch = global.fetch
    const request = (auth?: string) =>
        new Request('https://proficios.test/api/cron/sync-play', { headers: auth ? { authorization: auth } : {} })

    beforeEach(() => {
        process.env.CREDENTIALS_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
        clearPlayTokenCache()
    })
    afterEach(() => {
        global.fetch = originalFetch
        delete process.env.CRON_SECRET
        delete process.env.CREDENTIALS_ENCRYPTION_KEY
        vi.clearAllMocks()
    })

    it('is disabled when CRON_SECRET is not set', async () => {
        expect((await cronSyncPlay(request('Bearer x'))).status).toBe(503)
    })

    it('rejects a wrong secret', async () => {
        process.env.CRON_SECRET = 'correct-secret'
        expect((await cronSyncPlay(request('Bearer wrong-secret'))).status).toBe(401)
        expect((await cronSyncPlay(request())).status).toBe(401)
    })

    it('syncs due apps, reuses one token per key and skips apps synced recently', async () => {
        process.env.CRON_SECRET = 'correct-secret'
        const apps = [
            { id: 'a1', user_id: 'u1', package_name: 'com.one.app', credential_id: 'c1', last_synced_at: null },
            { id: 'a2', user_id: 'u1', package_name: 'com.two.app', credential_id: 'c1', last_synced_at: '2020-01-01T00:00:00Z' },
            { id: 'a3', user_id: 'u2', package_name: 'com.three.app', credential_id: 'c2', last_synced_at: new Date().toISOString() },
        ]
        const adminDb = createFakeDb(
            {
                apps: (q) => (q.op === 'select' ? { data: apps } : {}),
                store_credentials: () => ({ data: storedCredentialRow() }),
            },
            null
        )
        vi.mocked(createAdminClient).mockReturnValue(adminDb.client as never)
        const fetchMock = routeFetch({})

        const response = await cronSyncPlay(request('Bearer correct-secret'))

        expect(await response.json()).toMatchObject({ apps: 3, synced: 2, skipped: 1, failed: 0 })
        expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('oauth2'))).toHaveLength(1)
        expect(adminDb.find('apps', 'select')[0].filters).toContainEqual(['eq', 'is_demo', false])
    })
})
