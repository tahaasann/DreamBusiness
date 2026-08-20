import { describe, it, expect, vi } from 'vitest'
import { createCheckoutSession } from '@/app/actions/checkout'

// Mock Supabase Server Client to isolate server action context
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'usr_paddle_123', email: 'owner@business.com' } },
            }),
        },
        from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
        }),
    }),
}))

describe('Must-Have 5: Monetization & Paddle Billing Lifecycle Suite', () => {
    // 1. Validate Annual Checkout Payload Construction
    it('should generate valid checkout session parameters for annual billing', async () => {
        // Mock ENV Price ID
        process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ANNUAL = 'pri_annual_test_123'

        const result = await createCheckoutSession({ billingCycle: 'annual' })

        expect(result.success).toBe(true)
        expect(result.priceId).toBe('pri_annual_test_123')
        expect(result.customerEmail).toBe('owner@business.com')
        expect(result.userId).toBe('usr_paddle_123')
    })

    // 2. Validate Monthly Checkout Payload Construction
    it('should generate valid checkout session parameters for monthly billing', async () => {
        process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY = 'pri_monthly_test_456'

        const result = await createCheckoutSession({ billingCycle: 'monthly' })

        expect(result.success).toBe(true)
        expect(result.priceId).toBe('pri_monthly_test_456')
        expect(result.userId).toBe('usr_paddle_123')
    })
})