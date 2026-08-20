import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

interface PaddleCustomData {
    user_id?: string
    [key: string]: unknown
}

interface PaddleWebhookEvent {
    event_type: string
    data?: {
        id?: string
        status?: string
        custom_data?: PaddleCustomData
        customer_id?: string
    }
}

// HMAC-SHA256 Paddle Webhook Signature Verifier
function verifyPaddleSignature(
    rawBody: string,
    signatureHeader: string | null,
    secretKey: string
): boolean {
    if (!signatureHeader || !secretKey) return false

    const parts = signatureHeader.split(';')
    const tsPart = parts.find((p) => p.startsWith('ts='))
    const hPart = parts.find((p) => p.startsWith('h='))

    if (!tsPart || !hPart) return false

    const ts = tsPart.split('=')[1]
    const h = hPart.split('=')[1]

    const signedPayload = `${ts}:${rawBody}`
    const expectedHmac = crypto
        .createHmac('sha256', secretKey)
        .update(signedPayload)
        .digest('hex')

    try {
        return crypto.timingSafeEqual(
            Buffer.from(h, 'hex'),
            Buffer.from(expectedHmac, 'hex')
        )
    } catch {
        return false
    }
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text()
        const signatureHeader = request.headers.get('paddle-signature')
        const secretKey = process.env.PADDLE_API_SECRET_KEY || ''

        // Verify cryptographic signature in production environment
        if (secretKey && process.env.NODE_ENV === 'production') {
            const isValid = verifyPaddleSignature(rawBody, signatureHeader, secretKey)
            if (!isValid) {
                console.error('Invalid Paddle Webhook Signature')
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                )
            }
        }

        const body: PaddleWebhookEvent = JSON.parse(rawBody)
        const eventType = body.event_type
        const customData = body.data?.custom_data
        const userId = customData?.user_id

        console.log(`Received Paddle Webhook: ${eventType} for User: ${userId || 'unknown'}`)

        if (userId) {
            const supabase = await createClient()

            switch (eventType) {
                case 'transaction.completed':
                case 'subscription.created':
                case 'subscription.updated':
                    await supabase
                        .from('locations')
                        .update({ default_tone: 'pro_active' })
                        .eq('user_id', userId)
                    break

                case 'subscription.canceled':
                    await supabase
                        .from('locations')
                        .update({ default_tone: 'professional' })
                        .eq('user_id', userId)
                    break

                default:
                    break
            }
        }

        return NextResponse.json({ status: 'success', event: eventType })
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : 'Webhook handler failed.'
        console.error('Paddle Webhook Error:', error)
        return NextResponse.json(
            { error: errorMessage },
            { status: 400 }
        )
    }
}