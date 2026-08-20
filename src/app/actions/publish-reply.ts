'use server'

import { createClient } from '@/lib/supabase/server'
import { recordEventReplyPublished } from '@/lib/metrics-tracker'

export interface PublishReplyInput {
    googleReviewId: string
    authorName: string
    rating: number
    comment?: string | null
    businessName?: string
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
}

export async function publishReplyAndLog(input: PublishReplyInput): Promise<PublishReplyOutput> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        const {
            data: { session },
        } = await supabase.auth.getSession()

        const {
            googleReviewId,
            authorName,
            rating,
            comment,
            selectedTone,
            aiGeneratedDraft,
            finalPublishedText,
            userRating = 5,
        } = input

        if (!finalPublishedText || finalPublishedText.trim() === '') {
            return { success: false, error: 'Published response text cannot be empty.' }
        }

        const isEdited = aiGeneratedDraft.trim() !== finalPublishedText.trim()

        let locationId: string | null = null

        if (user) {
            const { data: userLocations } = await supabase
                .from('locations')
                .select('id')
                .eq('user_id', user.id)
                .limit(1)

            if (userLocations && userLocations.length > 0) {
                locationId = userLocations[0].id
            }
        }

        if (!locationId) {
            const { data: anyLocations } = await supabase
                .from('locations')
                .select('id')
                .limit(1)

            if (anyLocations && anyLocations.length > 0) {
                locationId = anyLocations[0].id
            }
        }

        if (!locationId) {
            return {
                success: false,
                error: 'No location found. Please sync Google Maps or create a demo location first.',
            }
        }

        if (session?.provider_token && googleReviewId.startsWith('accounts/')) {
            try {
                const googleApiRes = await fetch(
                    `https://mybusiness.googleapis.com/v4/${googleReviewId}/reply`,
                    {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${session.provider_token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ comment: finalPublishedText.trim() }),
                    }
                )

                if (!googleApiRes.ok) {
                    const gErr = await googleApiRes.json()
                    console.warn('Google Maps API publish warning:', gErr)
                }
            } catch (err: unknown) {
                console.error('Failed to post reply directly to Google API:', err)
            }
        }

        const { data: existingReviews } = await supabase
            .from('reviews')
            .select('id')
            .eq('google_review_id', googleReviewId)
            .limit(1)

        let reviewId = existingReviews?.[0]?.id

        if (!reviewId) {
            const { data: newRev, error: revInsErr } = await supabase
                .from('reviews')
                .insert({
                    location_id: locationId,
                    google_review_id: googleReviewId,
                    author_name: authorName,
                    rating,
                    comment: comment || null,
                    status: 'replied',
                    review_created_at: new Date().toISOString(),
                })
                .select('id')
                .single()

            if (revInsErr) throw revInsErr
            reviewId = newRev.id
        } else {
            await supabase
                .from('reviews')
                .update({ status: 'replied' })
                .eq('id', reviewId)
        }

        const { data: logData, error: logError } = await supabase
            .from('ai_draft_logs')
            .insert({
                review_id: reviewId,
                prompt_used: `Tone: ${selectedTone}, Rating: ${rating}`,
                selected_tone: selectedTone,
                ai_generated_draft: aiGeneratedDraft,
                final_published_text: finalPublishedText,
                is_edited: isEdited,
                user_rating: userRating,
            })
            .select('id')
            .single()

        if (logError) throw logError

        // Trigger atomic metric event
        await recordEventReplyPublished(isEdited)

        return {
            success: true,
            isEdited,
            logId: logData?.id,
        }
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : 'Failed to publish reply and log feedback.'
        console.error('Error in publishReplyAndLog:', error)
        return {
            success: false,
            error: errorMessage,
        }
    }
}