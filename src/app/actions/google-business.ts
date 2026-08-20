'use server'

import { createClient } from '@/lib/supabase/server'
import { recordEventBranchCreated } from '@/lib/metrics-tracker'

// Strong Types for Google Business Profile API
interface GoogleAccount {
    name: string
    accountName?: string
    type?: string
}

interface GoogleLocation {
    name: string
    title?: string
    storefrontAddress?: Record<string, unknown>
}

interface GoogleReviewer {
    displayName?: string
    profilePhotoUrl?: string
}

interface GoogleReviewReply {
    comment?: string
    updateTime?: string
}

export interface GoogleReview {
    name: string
    reviewId?: string
    reviewer?: GoogleReviewer
    starRating?: 'FIVE' | 'FOUR' | 'THREE' | 'TWO' | 'ONE' | string
    comment?: string
    createTime?: string
    updateTime?: string
    reviewReply?: GoogleReviewReply
}

interface GoogleReviewsResponse {
    reviews?: GoogleReview[]
    nextPageToken?: string
    totalReviewCount?: number
}

interface DemoReviewInsert {
    location_id: string
    google_review_id: string
    author_name: string
    rating: number
    comment: string
    status: string
    review_created_at: string
}

// Next.js Server Action: Convert Google API Star Rating Enum to Integer (Async)
export async function parseStarRating(starRating?: string): Promise<number> {
    switch (starRating) {
        case 'FIVE':
            return 5
        case 'FOUR':
            return 4
        case 'THREE':
            return 3
        case 'TWO':
            return 2
        case 'ONE':
            return 1
        default:
            return 5
    }
}

export async function syncGoogleLocations() {
    try {
        const supabase = await createClient()

        const {
            data: { session },
        } = await supabase.auth.getSession()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user || !session) {
            return { success: false, error: 'User not authenticated' }
        }

        const providerToken = session.provider_token

        if (!providerToken) {
            return {
                success: false,
                error: 'Google OAuth token missing. Please sign out and sign in with Google again.',
            }
        }

        // 1. Fetch Google Business Accounts
        const resAccounts = await fetch(
            'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
            {
                headers: { Authorization: `Bearer ${providerToken}` },
            }
        )

        const accountsData = await resAccounts.json()

        if (accountsData.error) {
            console.error('Google Accounts API Error:', accountsData.error)
            return {
                success: false,
                error: accountsData.error.message || 'Failed to fetch Google accounts.',
            }
        }

        const accounts: GoogleAccount[] = accountsData.accounts || []

        if (accounts.length === 0) {
            return {
                success: true,
                hasRealLocations: false,
                message: 'No Google Business accounts found for this Gmail address.',
            }
        }

        let syncedLocationsCount = 0
        let syncedReviewsCount = 0

        // 2. Iterate Accounts & Sync Locations
        for (const acc of accounts) {
            try {
                const resLocations = await fetch(
                    `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storefrontAddress`,
                    {
                        headers: { Authorization: `Bearer ${providerToken}` },
                    }
                )
                const locData = await resLocations.json()
                const locations: GoogleLocation[] = locData.locations || []

                for (const loc of locations) {
                    const { data: dbLocation } = await supabase
                        .from('locations')
                        .upsert(
                            {
                                user_id: user.id,
                                google_location_id: loc.name,
                                business_name: loc.title || 'My Business',
                                default_tone: 'professional',
                            },
                            { onConflict: 'google_location_id' }
                        )
                        .select('id')
                        .single()

                    syncedLocationsCount++

                    if (dbLocation) {
                        let pageToken: string | undefined = undefined
                        let maxPages = 5

                        do {
                            const reviewsUrl = `https://mybusiness.googleapis.com/v4/${acc.name}/${loc.name}/reviews?pageSize=50${
                                pageToken ? `&pageToken=${pageToken}` : ''
                            }`

                            const reviewsRes = await fetch(reviewsUrl, {
                                headers: { Authorization: `Bearer ${providerToken}` },
                            })

                            if (!reviewsRes.ok) break

                            const reviewsData: GoogleReviewsResponse = await reviewsRes.json()
                            const googleReviews: GoogleReview[] = reviewsData.reviews || []

                            for (const rev of googleReviews) {
                                const numericRating = await parseStarRating(rev.starRating)

                                await supabase.from('reviews').upsert(
                                    {
                                        location_id: dbLocation.id,
                                        google_review_id: rev.name,
                                        author_name: rev.reviewer?.displayName || 'Google User',
                                        rating: numericRating,
                                        comment: rev.comment || null,
                                        status: rev.reviewReply ? 'replied' : 'pending',
                                        review_created_at:
                                            rev.createTime || new Date().toISOString(),
                                    },
                                    { onConflict: 'google_review_id' }
                                )
                                syncedReviewsCount++
                            }

                            pageToken = reviewsData.nextPageToken
                            maxPages--
                        } while (pageToken && maxPages > 0)
                    }
                }
            } catch (branchError: unknown) {
                console.error(`Error processing branch ${acc.name}:`, branchError)
            }
        }

        return {
            success: true,
            hasRealLocations: syncedLocationsCount > 0,
            syncedCount: syncedLocationsCount,
            reviewsCount: syncedReviewsCount,
        }
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : 'Failed to sync Google Business Profile.'
        console.error('Error syncing Google Business data:', error)
        return {
            success: false,
            error: errorMessage,
        }
    }
}

export async function createDemoLocationForUser() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'User not authenticated' }
        }

        const { count } = await supabase
            .from('locations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        const branchNumber = (count || 0) + 1
        const branchNames = ['Kadıköy', 'Nişantaşı', 'Moda', 'Beşiktaş', 'Bebek']
        const branchSuffix = branchNames[(branchNumber - 1) % branchNames.length] || `#${branchNumber}`

        const uniqueDemoId = `loc_demo_${user.id.slice(0, 4)}_${Date.now()}`

        const { data: location, error: locError } = await supabase
            .from('locations')
            .insert({
                user_id: user.id,
                google_location_id: uniqueDemoId,
                business_name: `Metropolitan Bistro (${branchSuffix})`,
                default_tone: 'friendly',
            })
            .select()
            .single()

        if (locError) throw locError

        // Trigger atomic metric event
        await recordEventBranchCreated()

        const demoReviews: DemoReviewInsert[] = [
            {
                location_id: location.id,
                google_review_id: `rev_demo_${location.id.slice(0, 8)}_${Date.now()}_1`,
                author_name: 'Michael Scott',
                rating: 5,
                comment: `Outstanding ribeye steak and wine selection at the ${branchSuffix} branch!`,
                status: 'pending',
                review_created_at: new Date().toISOString(),
            },
            {
                location_id: location.id,
                google_review_id: `rev_demo_${location.id.slice(0, 8)}_${Date.now()}_2`,
                author_name: 'Elena Rostova',
                rating: 2,
                comment: `We reserved a table at ${branchSuffix} but had to wait 35 minutes in the rain.`,
                status: 'pending',
                review_created_at: new Date().toISOString(),
            },
            {
                location_id: location.id,
                google_review_id: `rev_demo_${location.id.slice(0, 8)}_${Date.now()}_3`,
                author_name: 'David Miller',
                rating: 4,
                comment: 'Great atmosphere and polite waiters. Dessert took a bit long.',
                status: 'pending',
                review_created_at: new Date().toISOString(),
            },
        ]

        const insertedReviews: Record<string, unknown>[] = []

        for (const rev of demoReviews) {
            const { data: insertedRev } = await supabase
                .from('reviews')
                .insert(rev)
                .select()
                .single()

            if (insertedRev) {
                insertedReviews.push(insertedRev as Record<string, unknown>)
            }
        }

        return {
            success: true,
            location,
            reviews: insertedReviews,
        }
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : 'Error creating demo location.'
        console.error('Error creating demo location:', error)
        return { success: false, error: errorMessage }
    }
}