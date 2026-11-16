import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { resolveGoogleAccessToken } from '@/lib/google/tokens'
import { publishReplyAndLog } from '@/app/actions/publish-reply'
import { createSupabaseMock } from './helpers/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/google/tokens', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/google/tokens')>()
    return { ...actual, resolveGoogleAccessToken: vi.fn() }
})

const DEMO_REVIEW = { id: 'rev_db_1', location_id: 'loc_1', google_review_id: 'rev_demo_abc_1', rating: 5 }
const GOOGLE_REVIEW = {
    id: 'rev_db_2',
    location_id: 'loc_1',
    google_review_id: 'accounts/111/locations/222/reviews/333',
    rating: 2,
}

function useSupabase(review: Record<string, unknown> | null, extra: Parameters<typeof createSupabaseMock>[0] = {}) {
    const mock = createSupabaseMock({
        tables: { reviews: review, locations: { id: 'loc_1' }, ai_draft_logs: { id: 'log_1' } },
        ...extra,
    })
    vi.mocked(createClient).mockResolvedValue(mock.client as never)
    return mock
}

const BASE_INPUT = {
    selectedTone: 'professional',
    aiGeneratedDraft: 'Thank you for visiting Metropolitan Bistro!',
    finalPublishedText: 'Thank you for visiting Metropolitan Bistro!',
}

describe('Human-in-the-loop publishing', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
        vi.mocked(resolveGoogleAccessToken).mockReset()
        vi.mocked(resolveGoogleAccessToken).mockResolvedValue({ ok: true, accessToken: 'google_access' })
        global.fetch = vi.fn()
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    it('rejects publishing when the response text is empty', async () => {
        useSupabase(DEMO_REVIEW)
        const result = await publishReplyAndLog({ ...BASE_INPUT, reviewId: 'rev_db_1', finalPublishedText: '   ' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('cannot be empty')
    })

    it('identifies unedited drafts approved as-is', async () => {
        useSupabase(DEMO_REVIEW)
        const result = await publishReplyAndLog({ ...BASE_INPUT, reviewId: 'rev_db_1' })

        expect(result.success).toBe(true)
        expect(result.isEdited).toBe(false)
    })

    it('identifies drafts edited by a human', async () => {
        useSupabase(DEMO_REVIEW)
        const result = await publishReplyAndLog({
            ...BASE_INPUT,
            reviewId: 'rev_db_1',
            finalPublishedText: 'We sincerely apologise for the wait, Elena. Please email us!',
        })

        expect(result.success).toBe(true)
        expect(result.isEdited).toBe(true)
    })

    it('never sends demo reviews to Google', async () => {
        useSupabase(DEMO_REVIEW)
        const result = await publishReplyAndLog({ ...BASE_INPUT, reviewId: 'rev_db_1' })

        expect(result.publishedTo).toBe('demo')
        expect(global.fetch).not.toHaveBeenCalled()
    })

    it('marks a Google review as replied only after Google accepts it', async () => {
        const { calls } = useSupabase(GOOGLE_REVIEW)
        vi.mocked(global.fetch).mockResolvedValue(new Response('{}', { status: 200 }))

        const result = await publishReplyAndLog({ ...BASE_INPUT, reviewId: 'rev_db_2' })

        expect(result).toMatchObject({ success: true, publishedTo: 'google' })
        const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
        expect(url).toBe('https://mybusiness.googleapis.com/v4/accounts/111/locations/222/reviews/333/reply')
        expect(init.method).toBe('PUT')
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer google_access')
        expect(calls.updates.filter((u) => u.table === 'reviews')).toEqual([
            { table: 'reviews', values: { status: 'replied' } },
        ])
    })

    it('reports the real Google error and changes nothing when Google refuses', async () => {
        const { calls } = useSupabase(GOOGLE_REVIEW)
        vi.mocked(global.fetch).mockResolvedValue(
            new Response(JSON.stringify({ error: { message: 'The caller does not have permission' } }), { status: 403 })
        )

        const result = await publishReplyAndLog({ ...BASE_INPUT, reviewId: 'rev_db_2' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('HTTP 403')
        expect(result.error).toContain('does not have permission')
        expect(calls.updates).toHaveLength(0)
        expect(calls.inserts).toHaveLength(0)
    })

    it('asks the user to reconnect Google when no token is available', async () => {
        const { calls } = useSupabase(GOOGLE_REVIEW)
        vi.mocked(resolveGoogleAccessToken).mockResolvedValue({ ok: false, reason: 'reconnect_required' })

        const result = await publishReplyAndLog({ ...BASE_INPUT, reviewId: 'rev_db_2' })

        expect(result.success).toBe(false)
        expect(result.needsGoogleReconnect).toBe(true)
        expect(global.fetch).not.toHaveBeenCalled()
        expect(calls.updates).toHaveLength(0)
    })

    it("refuses reviews from another user's location", async () => {
        useSupabase(GOOGLE_REVIEW, { tables: { reviews: GOOGLE_REVIEW, locations: null } })

        const result = await publishReplyAndLog({ ...BASE_INPUT, reviewId: 'rev_db_2' })

        expect(result).toMatchObject({ success: false, error: 'Review not found.' })
        expect(global.fetch).not.toHaveBeenCalled()
    })

    it('rejects tones outside the allow-list', async () => {
        useSupabase(DEMO_REVIEW)
        const result = await publishReplyAndLog({ ...BASE_INPUT, reviewId: 'rev_db_1', selectedTone: 'sarcastic' })

        expect(result).toMatchObject({ success: false, error: 'Invalid publish request.' })
    })
})
