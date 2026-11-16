import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { generateAiDraft } from '@/app/actions/generate-draft'
import { publishReplyAndLog } from '@/app/actions/publish-reply'
import { createDemoLocationForUser } from '@/app/actions/google-business'
import { createSupabaseMock } from './helpers/supabase-mock'

// Mock Vercel AI SDK for deterministic instant testing
vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof import('ai')>()
    return {
        ...actual,
        generateText: vi.fn().mockResolvedValue({
            text: 'Thank you for visiting Metropolitan Bistro! We appreciate your feedback.',
        }),
    }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/google/tokens', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/google/tokens')>()
    return {
        ...actual,
        resolveGoogleAccessToken: vi.fn().mockResolvedValue({ ok: true, accessToken: 'mock_google_access' }),
    }
})

describe('Proficios E2E Server Actions Test Suite', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
        const { client } = createSupabaseMock({
            providerToken: 'mock_google_oauth_token',
            tables: {
                locations: { id: 'mock_location_uuid_67890', business_name: 'Metropolitan Bistro (Kadıköy)' },
                reviews: {
                    id: 'mock_review_uuid_1',
                    location_id: 'mock_location_uuid_67890',
                    google_review_id: 'accounts/123/locations/456/reviews/789',
                    rating: 4,
                    comment: 'The steak was amazing but the service was a bit slow.',
                },
                ai_draft_logs: { id: 'mock_log_id_123' },
            },
        })
        vi.mocked(createClient).mockResolvedValue(client as never)

        global.fetch = vi.fn().mockImplementation((url, init) => {
            if (typeof url === 'string' && url.includes('googleapis.com')) {
                return Promise.resolve(
                    new Response(JSON.stringify({ status: 'SUCCESS' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
            }
            return originalFetch(url, init)
        })
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    // 1. Test AI Generation Engine
    it('should generate an AI draft response within latency constraints', async () => {
        const startTime = Date.now()

        const result = await generateAiDraft({
            reviewId: 'mock_review_uuid_1',
            tone: 'professional',
            language: 'en-US',
        })

        const duration = Date.now() - startTime

        expect(result.success).toBe(true)
        expect(typeof result.draft).toBe('string')
        expect(duration).toBeLessThan(1000)
    })

    // 2. Test Human-in-the-loop Reply & Feedback Engine
    it('should log published replies and detect human draft edits correctly', async () => {
        const result = await publishReplyAndLog({
            reviewId: 'mock_review_uuid_1',
            selectedTone: 'friendly',
            aiGeneratedDraft: 'Thank you for visiting us!',
            finalPublishedText: 'Thank you so much for visiting us Sarah!',
            userRating: 5,
        })

        expect(result.success).toBe(true)
        expect(result.isEdited).toBe(true)
        expect(result.publishedTo).toBe('google')
    })

    // 3. Test Demo Location & Review Creator Engine
    it('should seed a new store branch and generate initial reviews', async () => {
        const result = await createDemoLocationForUser()

        expect(result.success).toBe(true)
        expect(result.location).toBeDefined()
        expect(Array.isArray(result.reviews)).toBe(true)
    })

    // 4. Anonymous callers are refused by every mutating action
    it('should refuse anonymous callers on every mutating action', async () => {
        const { client } = createSupabaseMock({ user: null })
        vi.mocked(createClient).mockResolvedValue(client as never)

        const draft = await generateAiDraft({ reviewId: 'mock_review_uuid_1' })
        const publish = await publishReplyAndLog({
            reviewId: 'mock_review_uuid_1',
            selectedTone: 'friendly',
            aiGeneratedDraft: 'x',
            finalPublishedText: 'y',
        })
        const demo = await createDemoLocationForUser()

        expect(draft.success).toBe(false)
        expect(publish.success).toBe(false)
        expect(demo.success).toBe(false)
        expect(client.rpc).not.toHaveBeenCalled()
    })
})
