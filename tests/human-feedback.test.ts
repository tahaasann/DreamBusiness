import { describe, it, expect, vi } from 'vitest'
import { publishReplyAndLog } from '@/app/actions/publish-reply'

// Mock Supabase Server Client to provide request context in Vitest
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
            limit: vi.fn().mockResolvedValue({ data: [{ id: 'mock_location_uuid_67890' }] }),
            single: vi.fn().mockResolvedValue({
                data: { id: 'mock_log_id_123' },
                error: null,
            }),
            insert: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
        }),
    }),
}))

describe('Must-Have 4: Human-in-the-Loop Feedback Engine Suite', () => {
    // 1. Reject empty response text
    it('should reject publishing when the response text is empty', async () => {
        const result = await publishReplyAndLog({
            googleReviewId: 'rev_123',
            authorName: 'Alex',
            rating: 5,
            comment: 'Great service!',
            selectedTone: 'friendly',
            aiGeneratedDraft: 'Thanks for coming!',
            finalPublishedText: '   ',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('cannot be empty')
    })

    // 2. Accurately detect unedited draft (is_edited === false)
    it('should identify unedited drafts accurately when approved as-is', async () => {
        const text = 'Thank you for visiting Metropolitan Bistro!'
        const result = await publishReplyAndLog({
            googleReviewId: 'rev_demo_456',
            authorName: 'David',
            rating: 5,
            comment: 'Loved the food!',
            selectedTone: 'professional',
            aiGeneratedDraft: text,
            finalPublishedText: text,
            userRating: 5,
        })

        expect(result.success).toBe(true)
        expect(result.isEdited).toBe(false)
    })

    // 3. Accurately detect human edited draft (is_edited === true)
    it('should identify modified drafts when edited by human', async () => {
        const result = await publishReplyAndLog({
            googleReviewId: 'rev_demo_789',
            authorName: 'Elena',
            rating: 2,
            comment: 'Long wait time.',
            selectedTone: 'apologetic',
            aiGeneratedDraft: 'We apologize for the wait.',
            finalPublishedText: 'We sincerely apologize for the wait, Elena. Please email us!',
            userRating: 4,
        })

        expect(result.success).toBe(true)
        expect(result.isEdited).toBe(true)
    })
})