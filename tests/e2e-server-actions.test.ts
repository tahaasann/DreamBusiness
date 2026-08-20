import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateAiDraft } from '@/app/actions/generate-draft'
import { publishReplyAndLog } from '@/app/actions/publish-reply'
import { createDemoLocationForUser } from '@/app/actions/google-business'

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

// Mock Supabase Server Client to isolate server actions testing
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'test_user_uuid_12345', email: 'test@business.com' } },
            }),
            getSession: vi.fn().mockResolvedValue({
                data: { session: { provider_token: 'mock_google_oauth_token' } },
            }),
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [{ id: 'mock_location_uuid_67890' }] }),
            single: vi.fn().mockResolvedValue({
                data: { id: 'mock_id', business_name: 'Metropolitan Bistro (Kadıköy)' },
                error: null,
            }),
            insert: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
        }),
    }),
}))

describe('Proficios E2E Server Actions Test Suite', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
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
            reviewComment: 'The steak was amazing but the service was a bit slow.',
            rating: 4,
            businessName: 'Metropolitan Bistro',
            tone: 'professional',
            language: 'en',
        })

        const duration = Date.now() - startTime

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.draft).toBeDefined()
            expect(typeof result.draft).toBe('string')
        }
        expect(duration).toBeLessThan(1000)
    })

    // 2. Test Human-in-the-loop Reply & Feedback Engine
    it('should log published replies and detect human draft edits correctly', async () => {
        const result = await publishReplyAndLog({
            googleReviewId: 'accounts/123/locations/456/reviews/789',
            authorName: 'Sarah Jenkins',
            rating: 5,
            comment: 'Great experience!',
            businessName: 'Metropolitan Bistro',
            selectedTone: 'friendly',
            aiGeneratedDraft: 'Thank you for visiting us!',
            finalPublishedText: 'Thank you so much for visiting us Sarah!',
            userRating: 5,
        })

        expect(result.success).toBe(true)
        expect(result.isEdited).toBe(true)
    })

    // 3. Test Demo Location & Review Creator Engine
    it('should seed a new store branch and generate initial reviews', async () => {
        const result = await createDemoLocationForUser()

        expect(result.success).toBe(true)
        expect(result.location).toBeDefined()
        expect(result.reviews).toBeDefined()
        expect(Array.isArray(result.reviews)).toBe(true)
    })
})