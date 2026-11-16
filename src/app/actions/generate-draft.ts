'use server'

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/require-user'
import { consumeRateLimit, RATE_LIMITS, rateLimitMessage } from '@/lib/rate-limit'
import {
    buildDraftPrompt,
    DRAFT_LANGUAGES,
    DRAFT_TONES,
    type DraftLanguage,
    type DraftTone,
} from '@/lib/ai/draft-prompt'
import { executeWithRetry } from '@/lib/resilience'
import { recordEventDraftGenerated } from '@/lib/metrics-tracker'

const DRAFT_MODEL = 'gemini-3.5-flash-lite'

export interface GenerateDraftInput {
    /** Database id of the review. Rating, comment and business name are read from the database. */
    reviewId: string
    tone?: DraftTone
    /** 'en' is accepted as an alias of 'en-US' for older clients. */
    language?: DraftLanguage | 'en'
    targetKeywords?: string[]
}

export interface GenerateDraftOutput {
    success: boolean
    draft?: string
    error?: string
    latencyMs?: number
    securityFlags?: {
        injectionDetected: boolean
        scriptTagsSanitized: boolean
        isEmptyComment: boolean
    }
}

const GenerateDraftSchema = z.object({
    reviewId: z.string().trim().min(1).max(100),
    tone: z.enum(DRAFT_TONES).default('professional'),
    language: z.preprocess(
        (value) => (value === undefined || value === 'en' ? 'en-US' : value),
        z.enum(DRAFT_LANGUAGES)
    ),
    targetKeywords: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
})

export async function generateAiDraft(input: GenerateDraftInput): Promise<GenerateDraftOutput> {
    const startTime = Date.now()

    try {
        const auth = await requireUser()
        if (!auth.ok) {
            return { success: false, error: 'You need to sign in to generate drafts.' }
        }
        const { supabase, user } = auth

        const parsed = GenerateDraftSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: 'Invalid draft request.' }
        }
        const { reviewId, tone, language, targetKeywords } = parsed.data

        const limit = await consumeRateLimit(supabase, RATE_LIMITS.aiDraft)
        if (!limit.allowed) {
            return { success: false, error: rateLimitMessage(limit.reason) }
        }

        // Review text and business name come from the database, never from the client,
        // and the location must belong to the signed-in user.
        const { data: review } = await supabase
            .from('reviews')
            .select('id, location_id, rating, comment')
            .eq('id', reviewId)
            .maybeSingle()

        if (!review) {
            return { success: false, error: 'Review not found.' }
        }

        const { data: location } = await supabase
            .from('locations')
            .select('id, business_name')
            .eq('id', review.location_id)
            .eq('user_id', user.id)
            .maybeSingle()

        if (!location) {
            return { success: false, error: 'Review not found.' }
        }

        const draftPrompt = buildDraftPrompt({
            businessName: location.business_name,
            rating: review.rating,
            comment: review.comment,
            tone,
            language,
            targetKeywords,
        })

        const { text } = await executeWithRetry(
            () =>
                generateText({
                    model: google(DRAFT_MODEL),
                    system: draftPrompt.system,
                    prompt: draftPrompt.prompt,
                    temperature: 0.7,
                }),
            { maxRetries: 3, baseDelayMs: 150 }
        )

        await recordEventDraftGenerated()

        return {
            success: true,
            draft: text.trim(),
            latencyMs: Date.now() - startTime,
            securityFlags: draftPrompt.securityFlags,
        }
    } catch (error: unknown) {
        console.error('Gemini AI Generation Engine Error:', error)
        return { success: false, error: 'Failed to generate AI draft.' }
    }
}
