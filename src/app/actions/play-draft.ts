'use server'

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/require-user'
import { consumeRateLimit, RATE_LIMITS, rateLimitMessage } from '@/lib/rate-limit'
import { DRAFT_LANGUAGES, DRAFT_TONES, type DraftLanguage, type DraftTone } from '@/lib/ai/draft-options'
import {
    buildPlayReplyPrompt,
    defaultReplyLanguage,
    enforceReplyRules,
    findReplyIssues,
    issueFeedback,
} from '@/lib/ai/play-prompt'
import { executeWithRetry } from '@/lib/resilience'
import { recordEventDraftGenerated } from '@/lib/metrics-tracker'

const DRAFT_MODEL = 'gemini-3.5-flash-lite'

const Schema = z.object({
    reviewId: z.string().uuid(),
    tone: z.enum(DRAFT_TONES).optional(),
    language: z.enum(DRAFT_LANGUAGES).optional(),
})

export type GeneratePlayDraftResult =
    | {
          success: true
          draft: string
          tone: DraftTone
          language: DraftLanguage
          /** Where the language came from when the user did not choose one. */
          languageSource: 'user' | 'play' | 'text' | 'fallback'
          securityFlags: { injectionDetected: boolean; scriptTagsSanitized: boolean; isEmptyComment: boolean }
      }
    | { success: false; error: string }

/**
 * Drafts a Google Play reply (Faz 3). Review text, app name and technical
 * context are read from the database for the signed-in owner, never taken from
 * the client. The answer is checked against Play's length limit and policy and
 * rewritten once if needed; anything still wrong is cleaned up in code.
 */
export async function generatePlayDraft(input: {
    reviewId: string
    tone?: string
    language?: string
}): Promise<GeneratePlayDraftResult> {
    try {
        const auth = await requireUser()
        if (!auth.ok) return { success: false, error: 'You need to sign in to generate drafts.' }
        const { supabase, user } = auth

        const parsed = Schema.safeParse(input)
        if (!parsed.success) return { success: false, error: 'Invalid draft request.' }

        const limit = await consumeRateLimit(supabase, RATE_LIMITS.aiDraft)
        if (!limit.allowed) return { success: false, error: rateLimitMessage(limit.reason) }

        const { data: review } = await supabase
            .from('app_reviews')
            .select(
                'id, star_rating, review_text, reviewer_language, app_version_name, app_version_code, device, android_os_version, apps!inner(display_name, default_tone)'
            )
            .eq('id', parsed.data.reviewId)
            .eq('user_id', user.id)
            .maybeSingle()
        const app = review?.apps as unknown as { display_name: string; default_tone: string } | undefined
        if (!review || !app) return { success: false, error: 'Review not found.' }

        const tone: DraftTone =
            parsed.data.tone ?? ((DRAFT_TONES as readonly string[]).includes(app.default_tone) ? (app.default_tone as DraftTone) : 'professional')
        const picked = parsed.data.language
            ? { language: parsed.data.language, source: 'user' as const }
            : defaultReplyLanguage(review.reviewer_language, review.review_text)

        const prompt = buildPlayReplyPrompt({
            appName: app.display_name,
            rating: review.star_rating,
            reviewText: review.review_text,
            tone,
            language: picked.language,
            appVersionName: review.app_version_name,
            appVersionCode: review.app_version_code,
            device: review.device,
            androidOsVersion: review.android_os_version,
        })

        const ask = (messages: Array<{ role: 'user' | 'assistant'; content: string }>) =>
            executeWithRetry(
                () => generateText({ model: google(DRAFT_MODEL), system: prompt.system, messages, temperature: 0.7 }),
                { maxRetries: 3, baseDelayMs: 150 }
            )

        const first = await ask([{ role: 'user', content: prompt.prompt }])
        let draft = first.text.trim()

        const issues = findReplyIssues(draft)
        if (issues.length > 0) {
            const second = await ask([
                { role: 'user', content: prompt.prompt },
                { role: 'assistant', content: draft },
                { role: 'user', content: issueFeedback(issues) },
            ])
            draft = second.text.trim() || draft
        }
        draft = enforceReplyRules(draft)
        if (!draft) return { success: false, error: 'The AI returned an empty draft. Please try again.' }

        await recordEventDraftGenerated()
        return {
            success: true,
            draft,
            tone,
            language: picked.language,
            languageSource: picked.source,
            securityFlags: prompt.securityFlags,
        }
    } catch (error: unknown) {
        console.error('generatePlayDraft failed:', error)
        return { success: false, error: 'Failed to generate the AI draft.' }
    }
}
