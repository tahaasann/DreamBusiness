'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth/require-user'
import { consumeRateLimit, RATE_LIMITS, rateLimitMessage } from '@/lib/rate-limit'
import { DRAFT_TONES } from '@/lib/ai/draft-prompt'
import { googleTokenErrorMessage, resolveGoogleAccessToken } from '@/lib/google/tokens'
import { recordEventReplyPublished } from '@/lib/metrics-tracker'

export interface PublishReplyInput {
    /** Database id of the review being answered. */
    reviewId: string
    selectedTone: string
    aiGeneratedDraft: string
    finalPublishedText: string
    userRating?: number
}

export interface PublishReplyOutput {
    success: boolean
    isEdited?: boolean
    error?: string
    logId?: string
    /** 'google' when the reply is live on Google Maps, 'demo' for demo reviews. */
    publishedTo?: 'google' | 'demo'
    /** True when the user has to sign in with Google again. */
    needsGoogleReconnect?: boolean
    /** Set when Google accepted the reply but saving our own history failed. */
    warning?: string
}

const PublishReplySchema = z.object({
    reviewId: z.string().trim().min(1).max(100),
    selectedTone: z.enum(DRAFT_TONES),
    aiGeneratedDraft: z.string().max(4096),
    finalPublishedText: z
        .string()
        .trim()
        .min(1, 'Published response text cannot be empty.')
        .max(4096, 'Reply is too long (maximum 4096 characters).'),
    userRating: z.number().int().min(1).max(5).default(5),
})

const GOOGLE_REVIEW_PREFIX = 'accounts/'

async function readGoogleError(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { error?: { message?: string } }
        return body.error?.message ? `: ${body.error.message}` : ''
    } catch {
        return ''
    }
}

export async function publishReplyAndLog(input: PublishReplyInput): Promise<PublishReplyOutput> {
    try {
        const auth = await requireUser()
        if (!auth.ok) {
            return { success: false, error: 'You need to sign in to publish replies.' }
        }
        const { supabase, user } = auth

        const parsed = PublishReplySchema.safeParse(input)
        if (!parsed.success) {
            const textIssue = parsed.error.issues.find((issue) => issue.path[0] === 'finalPublishedText')
            return { success: false, error: textIssue?.message ?? 'Invalid publish request.' }
        }
        const { reviewId, selectedTone, aiGeneratedDraft, finalPublishedText, userRating } = parsed.data

        const limit = await consumeRateLimit(supabase, RATE_LIMITS.publishReply)
        if (!limit.allowed) {
            return { success: false, error: rateLimitMessage(limit.reason) }
        }

        // The review must exist and belong to one of the user's own locations.
        const { data: review } = await supabase
            .from('reviews')
            .select('id, location_id, google_review_id, rating')
            .eq('id', reviewId)
            .maybeSingle()
        if (!review) {
            return { success: false, error: 'Review not found.' }
        }

        const { data: location } = await supabase
            .from('locations')
            .select('id')
            .eq('id', review.location_id)
            .eq('user_id', user.id)
            .maybeSingle()
        if (!location) {
            return { success: false, error: 'Review not found.' }
        }

        const isEdited = aiGeneratedDraft.trim() !== finalPublishedText
        const isGoogleReview =
            typeof review.google_review_id === 'string' &&
            review.google_review_id.startsWith(GOOGLE_REVIEW_PREFIX)

        // 1. Publish to Google first. If Google does not accept the reply, nothing is
        //    marked as published and the user sees the real reason.
        if (isGoogleReview) {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            const token = await resolveGoogleAccessToken(user.id, session?.provider_token)
            if (!token.ok) {
                return {
                    success: false,
                    error: googleTokenErrorMessage(token.reason),
                    needsGoogleReconnect:
                        token.reason === 'not_connected' || token.reason === 'reconnect_required',
                }
            }

            let googleResponse: Response
            try {
                googleResponse = await fetch(
                    `https://mybusiness.googleapis.com/v4/${review.google_review_id}/reply`,
                    {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${token.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ comment: finalPublishedText }),
                    }
                )
            } catch (networkError: unknown) {
                console.error('Google reply request failed:', networkError)
                return { success: false, error: 'Could not reach Google. Nothing was published; please try again.' }
            }

            if (!googleResponse.ok) {
                const detail = await readGoogleError(googleResponse)
                console.warn('Google rejected the reply:', googleResponse.status, detail)
                return {
                    success: false,
                    error: `Google did not accept the reply (HTTP ${googleResponse.status}${detail}). Nothing was marked as published.`,
                    needsGoogleReconnect: googleResponse.status === 401,
                }
            }
        }

        const publishedTo = isGoogleReview ? 'google' : 'demo'

        // 2. Record the result in our own database.
        const statusUpdate = await supabase.from('reviews').update({ status: 'replied' }).eq('id', review.id)

        const { data: logData, error: logError } = await supabase
            .from('ai_draft_logs')
            .insert({
                review_id: review.id,
                prompt_used: `Tone: ${selectedTone}, Rating: ${review.rating}`,
                selected_tone: selectedTone,
                ai_generated_draft: aiGeneratedDraft,
                final_published_text: finalPublishedText,
                is_edited: isEdited,
                user_rating: userRating,
            })
            .select('id')
            .single()

        const saveError = statusUpdate.error ?? logError
        if (saveError) {
            console.error('Saving reply history failed:', saveError)
            if (!isGoogleReview) {
                return { success: false, error: 'Failed to save the demo reply. Please try again.' }
            }
            // The reply is already live on Google; report success but say what is missing.
            return {
                success: true,
                isEdited,
                publishedTo,
                warning: 'The reply is live on Google, but saving it to your history failed.',
            }
        }

        await recordEventReplyPublished(isEdited)

        return { success: true, isEdited, logId: logData?.id, publishedTo }
    } catch (error: unknown) {
        console.error('Error in publishReplyAndLog:', error)
        return { success: false, error: 'Failed to publish reply. Nothing was marked as published.' }
    }
}
