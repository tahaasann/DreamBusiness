import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

interface PaddleBillingCycle {
    interval?: string
    frequency?: number
}

interface PaddlePriceItem {
    id?: string
    billing_cycle?: PaddleBillingCycle
}

interface PaddleSubscriptionItem {
    price?: PaddlePriceItem
}

interface PaddlePeriod {
    starts_at?: string
    ends_at?: string
}

interface PaddleWebhookEvent {
    event_id?: string
    event_type: string
    occurred_at?: string
    data?: {
        id?: string
        status?: string
        customer_id?: string
        subscription_id?: string
        items?: PaddleSubscriptionItem[]
        billing_cycle?: PaddleBillingCycle
        current_billing_period?: PaddlePeriod
        /** Transactions carry the period here instead of current_billing_period. */
        billing_period?: PaddlePeriod
        scheduled_change?: {
            action?: string
            effective_at?: string
        }
        canceled_at?: string
        custom_data?: {
            user_id?: string
            [key: string]: unknown
        }
    }
}

interface ParsedSignature {
    ts: number
    h1: string
}

// Same tolerance as Paddle's official SDK.
const MAX_TIMESTAMP_AGE_SECONDS = 5

const SUBSCRIPTION_EVENTS = new Set([
    'subscription.created',
    'subscription.activated',
    'subscription.updated',
    'subscription.paused',
    'subscription.past_due',
    'subscription.canceled',
    'transaction.completed',
])

function parsePaddleSignature(header: string): ParsedSignature | null {
    const parts = header.split(';')
    let tsStr: string | undefined
    let h1: string | undefined

    for (const part of parts) {
        const [key, ...rest] = part.split('=')
        const trimmedKey = key?.trim()
        const value = rest.join('=').trim()

        if (trimmedKey === 'ts') tsStr = value
        if (trimmedKey === 'h1') h1 = value
    }

    if (!tsStr || !h1) return null
    const ts = parseInt(tsStr, 10)
    if (isNaN(ts)) return null

    return { ts, h1 }
}

function verifyPaddleSignature(
    rawBody: string,
    signatureHeader: string | null,
    secretKey: string
): { valid: boolean; reason?: string } {
    if (!signatureHeader) return { valid: false, reason: 'Missing paddle-signature header' }

    const parsed = parsePaddleSignature(signatureHeader)
    if (!parsed) return { valid: false, reason: 'Malformed signature header' }

    const { ts, h1 } = parsed
    const now = Math.floor(Date.now() / 1000)

    if (Math.abs(now - ts) > MAX_TIMESTAMP_AGE_SECONDS) {
        return { valid: false, reason: 'Timestamp tolerance exceeded' }
    }

    const signedPayload = `${ts}:${rawBody}`
    const expectedHmac = crypto.createHmac('sha256', secretKey).update(signedPayload).digest('hex')

    try {
        const h1Buffer = Buffer.from(h1, 'hex')
        const expectedBuffer = Buffer.from(expectedHmac, 'hex')

        if (h1Buffer.length !== expectedBuffer.length) {
            return { valid: false, reason: 'Signature digest length mismatch' }
        }

        return crypto.timingSafeEqual(h1Buffer, expectedBuffer)
            ? { valid: true }
            : { valid: false, reason: 'HMAC signature mismatch' }
    } catch {
        return { valid: false, reason: 'Cryptographic comparison failure' }
    }
}

class WebhookStoreError extends Error {}

/** Every database write must succeed; otherwise Paddle has to retry the event. */
function assertOk(result: { error: { message: string } | null }, step: string): void {
    if (result.error) {
        throw new WebhookStoreError(`${step}: ${result.error.message}`)
    }
}

function resolveBillingCycle(data: PaddleWebhookEvent['data']): 'monthly' | 'annual' {
    const interval =
        data?.billing_cycle?.interval ?? data?.items?.[0]?.price?.billing_cycle?.interval ?? 'year'
    return interval === 'month' ? 'monthly' : 'annual'
}

function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY
    if (!webhookSecret) {
        console.error('Paddle webhook rejected: PADDLE_WEBHOOK_SECRET_KEY is not set.')
        return jsonError('Webhook is not configured', 500)
    }

    const rawBody = await request.text()
    const verification = verifyPaddleSignature(
        rawBody,
        request.headers.get('paddle-signature'),
        webhookSecret
    )
    if (!verification.valid) {
        console.warn('Paddle webhook signature rejected:', verification.reason)
        return jsonError('Unauthorized', 401)
    }

    let body: PaddleWebhookEvent
    try {
        body = JSON.parse(rawBody)
    } catch {
        return jsonError('Invalid JSON payload', 400)
    }
    if (!body?.event_type) {
        return jsonError('Missing event_type', 400)
    }

    let supabase: ReturnType<typeof createAdminClient>
    try {
        supabase = createAdminClient()
    } catch (error: unknown) {
        console.error('Paddle webhook rejected:', error)
        return jsonError('Webhook is not configured', 500)
    }

    const eventId = body.event_id
    const eventType = body.event_type
    const eventData = body.data

    try {
        // 1. Idempotency: skip events that were fully processed before.
        if (eventId) {
            const existing = await supabase
                .from('webhook_events')
                .select('id, status')
                .eq('paddle_event_id', eventId)
                .maybeSingle()
            assertOk(existing, 'idempotency lookup')

            if (existing.data?.status === 'processed') {
                return NextResponse.json({ status: 'already_processed', event_id: eventId })
            }
        }

        const paddleSubId = eventType.startsWith('subscription.')
            ? eventData?.id
            : eventData?.subscription_id

        // 2. Resolve the user: checkout custom_data first, then an existing subscription row.
        let userId = eventData?.custom_data?.user_id
        if (!userId && paddleSubId) {
            const match = await supabase
                .from('subscriptions')
                .select('user_id')
                .eq('paddle_subscription_id', paddleSubId)
                .maybeSingle()
            assertOk(match, 'subscription lookup')
            userId = match.data?.user_id ?? undefined
        }

        const now = new Date().toISOString()

        if (userId) {
            switch (eventType) {
                case 'subscription.created':
                case 'subscription.activated':
                case 'subscription.updated':
                case 'transaction.completed': {
                    const period = eventData?.current_billing_period ?? eventData?.billing_period
                    const rawStatus = eventData?.status || 'active'
                    const record: Record<string, unknown> = {
                        user_id: userId,
                        paddle_customer_id: eventData?.customer_id ?? null,
                        paddle_subscription_id: paddleSubId ?? null,
                        paddle_price_id: eventData?.items?.[0]?.price?.id ?? null,
                        plan: 'pro',
                        status: rawStatus === 'completed' ? 'active' : rawStatus,
                        billing_cycle: resolveBillingCycle(eventData),
                        current_period_start: period?.starts_at ?? null,
                        current_period_end: period?.ends_at ?? null,
                        updated_at: now,
                    }
                    // Only subscription events know about scheduled cancellations;
                    // a transaction must not wipe them.
                    if (eventType.startsWith('subscription.')) {
                        record.cancel_at = eventData?.scheduled_change?.effective_at ?? null
                        record.canceled_at = eventData?.canceled_at ?? null
                    }

                    const result = await supabase
                        .from('subscriptions')
                        .upsert(record, { onConflict: 'user_id' })
                    assertOk(result, `${eventType} upsert`)
                    break
                }

                case 'subscription.paused':
                case 'subscription.past_due': {
                    const result = await supabase
                        .from('subscriptions')
                        .update({ status: eventData?.status || eventType.split('.')[1], updated_at: now })
                        .eq('user_id', userId)
                    assertOk(result, `${eventType} update`)
                    break
                }

                case 'subscription.canceled': {
                    const result = await supabase
                        .from('subscriptions')
                        .update({
                            status: 'canceled',
                            canceled_at: eventData?.canceled_at || now,
                            updated_at: now,
                        })
                        .eq('user_id', userId)
                    assertOk(result, `${eventType} update`)
                    break
                }
            }
        } else if (SUBSCRIPTION_EVENTS.has(eventType)) {
            console.warn(`Paddle ${eventType} (${eventId}) could not be linked to a user.`)
        }

        // 3. Record the event only after every write above succeeded.
        if (eventId) {
            const ledger = await supabase.from('webhook_events').upsert(
                {
                    paddle_event_id: eventId,
                    event_type: eventType,
                    payload: body,
                    processed_at: now,
                    status: 'processed',
                },
                { onConflict: 'paddle_event_id' }
            )
            assertOk(ledger, 'idempotency ledger')
        }

        return NextResponse.json({ status: 'success', event: eventType })
    } catch (error: unknown) {
        // A non-2xx response makes Paddle retry the delivery.
        console.error('Paddle webhook processing failed:', error)
        return jsonError('Webhook processing failed', 500)
    }
}
