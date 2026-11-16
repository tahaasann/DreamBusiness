import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    recordEventBranchCreated,
    recordEventDraftGenerated,
    recordEventReplyPublished,
} from '@/lib/metrics-tracker'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

describe('Public metrics', () => {
    const rpc = vi.fn()

    beforeEach(() => {
        rpc.mockReset()
        rpc.mockResolvedValue({ data: null, error: null })
        vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)
    })

    it('increments counters through the server-only atomic function', async () => {
        await recordEventBranchCreated()
        await recordEventDraftGenerated()
        await recordEventReplyPublished(false)
        await recordEventReplyPublished(true)

        expect(rpc.mock.calls.map(([fn]) => fn)).toEqual(Array(4).fill('increment_platform_metrics'))
        expect(rpc.mock.calls[0][1]).toMatchObject({ p_active_storefronts: 1, p_total_drafts_generated: 0 })
        expect(rpc.mock.calls[1][1]).toMatchObject({ p_total_drafts_generated: 1 })
        expect(rpc.mock.calls[2][1]).toMatchObject({ p_reviews_responded: 1, p_unedited_drafts_approved: 1 })
        expect(rpc.mock.calls[3][1]).toMatchObject({ p_reviews_responded: 1, p_unedited_drafts_approved: 0 })
    })

    it('never breaks the user action when metrics cannot be written', async () => {
        rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } })
        await expect(recordEventDraftGenerated()).resolves.toBeUndefined()

        vi.mocked(createAdminClient).mockImplementation(() => {
            throw new Error('SUPABASE_SECRET_KEY missing')
        })
        await expect(recordEventBranchCreated()).resolves.toBeUndefined()
    })
})
