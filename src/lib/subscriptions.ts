import { createClient } from '@/lib/supabase/server'

export interface SubscriptionRecord {
    id: string
    user_id: string
    paddle_customer_id?: string | null
    paddle_subscription_id?: string | null
    paddle_price_id?: string | null
    plan: 'starter' | 'pro' | 'agency' | string
    status: 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled' | 'inactive' | string
    billing_cycle: 'monthly' | 'annual' | string
    current_period_start?: string | null
    current_period_end?: string | null
    cancel_at?: string | null
    canceled_at?: string | null
    created_at?: string
    updated_at?: string
}

export interface EntitlementStatus {
    isPro: boolean
    isActive: boolean
    plan: string
    status: string
    subscription: SubscriptionRecord | null
}

export async function getUserSubscription(userId?: string): Promise<SubscriptionRecord | null> {
    try {
        const supabase = await createClient()
        let targetUserId = userId

        if (!targetUserId) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null
            targetUserId = user.id
        }

        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', targetUserId)
            .maybeSingle()

        if (error || !data) return null
        return data as SubscriptionRecord
    } catch (err: unknown) {
        console.error('Failed to retrieve user subscription:', err)
        return null
    }
}

export async function checkUserEntitlement(userId?: string): Promise<EntitlementStatus> {
    const subscription = await getUserSubscription(userId)

    if (!subscription) {
        return {
            isPro: false,
            isActive: false,
            plan: 'free',
            status: 'inactive',
            subscription: null,
        }
    }

    const isActive = ['active', 'trialing'].includes(subscription.status)
    const isPro = isActive && ['pro', 'agency'].includes(subscription.plan.toLowerCase())

    return {
        isPro,
        isActive,
        plan: subscription.plan,
        status: subscription.status,
        subscription,
    }
}