import crypto from 'crypto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { POST } from '@/app/api/webhooks/paddle/route'
import { createSupabaseMock } from './helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

const SECRET = 'pdl_ntfset_test_secret'

function signedRequest(payload: unknown, options: { secret?: string; ts?: number } = {}) {
    const body = JSON.stringify(payload)
    const ts = options.ts ?? Math.floor(Date.now() / 1000)
    const h1 = crypto
        .createHmac('sha256', options.secret ?? SECRET)
        .update(`${ts}:${body}`)
        .digest('hex')
    return new Request('http://localhost/api/webhooks/paddle', {
        method: 'POST',
        headers: { 'paddle-signature': `ts=${ts};h1=${h1}` },
        body,
    })
}

const SUBSCRIPTION_CREATED = {
    event_id: 'evt_01',
    event_type: 'subscription.created',
    data: {
        id: 'sub_01',
        status: 'active',
        customer_id: 'ctm_01',
        items: [{ price: { id: 'pri_monthly', billing_cycle: { interval: 'month', frequency: 1 } } }],
        billing_cycle: { interval: 'month', frequency: 1 },
        current_billing_period: { starts_at: '2026-11-15T00:00:00Z', ends_at: '2026-12-15T00:00:00Z' },
        custom_data: { user_id: 'user_owner_1' },
    },
}

describe('Paddle webhook', () => {
    const originalSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY

    beforeEach(() => {
        process.env.PADDLE_WEBHOOK_SECRET_KEY = SECRET
        vi.mocked(createAdminClient).mockReset()
    })

    afterEach(() => {
        process.env.PADDLE_WEBHOOK_SECRET_KEY = originalSecret
    })

    it('rejects requests with a wrong signature', async () => {
        const res = await POST(signedRequest(SUBSCRIPTION_CREATED, { secret: 'attacker_secret' }))

        expect(res.status).toBe(401)
        expect(await res.json()).toEqual({ error: 'Unauthorized' })
        expect(createAdminClient).not.toHaveBeenCalled()
    })

    it('rejects replayed requests with an old timestamp', async () => {
        const res = await POST(signedRequest(SUBSCRIPTION_CREATED, { ts: Math.floor(Date.now() / 1000) - 60 }))
        expect(res.status).toBe(401)
    })

    it('refuses to run without a webhook secret', async () => {
        delete process.env.PADDLE_WEBHOOK_SECRET_KEY
        const res = await POST(signedRequest(SUBSCRIPTION_CREATED))
        expect(res.status).toBe(500)
    })

    it('returns 500 when the admin client is not configured', async () => {
        vi.mocked(createAdminClient).mockImplementation(() => {
            throw new Error('SUPABASE_SECRET_KEY missing')
        })
        const res = await POST(signedRequest(SUBSCRIPTION_CREATED))
        expect(res.status).toBe(500)
    })

    it('stores the subscription with the admin client and then marks the event', async () => {
        const { client, calls } = createSupabaseMock({ user: null })
        vi.mocked(createAdminClient).mockReturnValue(client as never)

        const res = await POST(signedRequest(SUBSCRIPTION_CREATED))

        expect(res.status).toBe(200)
        expect(calls.upserts.map((u) => u.table)).toEqual(['subscriptions', 'webhook_events'])
        expect(calls.upserts[0].values).toMatchObject({
            user_id: 'user_owner_1',
            plan: 'pro',
            status: 'active',
            billing_cycle: 'monthly',
            paddle_subscription_id: 'sub_01',
        })
    })

    it('returns 500 and does not mark the event when the database write fails', async () => {
        const { client, calls } = createSupabaseMock({
            user: null,
            tableErrors: { subscriptions: { message: 'permission denied for table subscriptions' } },
        })
        vi.mocked(createAdminClient).mockReturnValue(client as never)

        const res = await POST(signedRequest(SUBSCRIPTION_CREATED))

        expect(res.status).toBe(500)
        expect(calls.upserts.some((u) => u.table === 'webhook_events')).toBe(false)
    })

    it('reads the billing cycle of transactions from the price', async () => {
        const { client, calls } = createSupabaseMock({ user: null })
        vi.mocked(createAdminClient).mockReturnValue(client as never)

        const res = await POST(
            signedRequest({
                event_id: 'evt_02',
                event_type: 'transaction.completed',
                data: {
                    id: 'txn_01',
                    status: 'completed',
                    subscription_id: 'sub_01',
                    items: [{ price: { id: 'pri_monthly', billing_cycle: { interval: 'month' } } }],
                    billing_period: { starts_at: '2026-11-15T00:00:00Z', ends_at: '2026-12-15T00:00:00Z' },
                    custom_data: { user_id: 'user_owner_1' },
                },
            })
        )

        expect(res.status).toBe(200)
        const record = calls.upserts[0].values as Record<string, unknown>
        expect(record.billing_cycle).toBe('monthly')
        expect(record.status).toBe('active')
        expect(record).not.toHaveProperty('cancel_at')
    })

    it('skips events that were already processed', async () => {
        const { client, calls } = createSupabaseMock({
            user: null,
            tables: { webhook_events: { id: 'row_1', status: 'processed' } },
        })
        vi.mocked(createAdminClient).mockReturnValue(client as never)

        const res = await POST(signedRequest(SUBSCRIPTION_CREATED))

        expect(res.status).toBe(200)
        expect(await res.json()).toMatchObject({ status: 'already_processed' })
        expect(calls.upserts).toHaveLength(0)
    })
})
