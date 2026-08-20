'use server'

import { createClient } from '@/lib/supabase/server'

export interface CreateCheckoutInput {
    billingCycle?: 'monthly' | 'annual'
}

export interface CreateCheckoutOutput {
    success: boolean
    priceId?: string
    customerEmail?: string
    userId?: string
    error?: string
}

export async function createCheckoutSession(
    input?: CreateCheckoutInput
): Promise<CreateCheckoutOutput> {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'User not authenticated' }
        }

        const cycle = input?.billingCycle || 'annual'
        const priceId =
            cycle === 'annual'
                ? process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ANNUAL
                : process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY

        if (!priceId) {
            return {
                success: false,
                error: `Paddle Price ID for ${cycle} billing is not configured.`,
            }
        }

        return {
            success: true,
            priceId,
            customerEmail: user.email || '',
            userId: user.id,
        }
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : 'Failed to create checkout session.'
        console.error('Checkout error:', error)
        return { success: false, error: errorMessage }
    }
}