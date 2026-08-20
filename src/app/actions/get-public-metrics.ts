'use server'

import { createClient } from '@/lib/supabase/server'

export interface PublicMetrics {
    activeStorefronts: number
    reviewsResponded: number
    aiApprovalRate: number
}

export async function getPublicMetrics(): Promise<PublicMetrics> {
    try {
        const supabase = await createClient()

        // Read single row indexed by PK (id = 1) -> Execution time < 1ms
        const { data } = await supabase
            .from('platform_metrics')
            .select('active_storefronts, reviews_responded, total_drafts_generated, unedited_drafts_approved')
            .eq('id', 1)
            .single()

        if (!data) {
            return { activeStorefronts: 0, reviewsResponded: 0, aiApprovalRate: 100 }
        }

        const totalResponded = data.reviews_responded || 0
        const unedited = data.unedited_drafts_approved || 0
        const aiApprovalRate = totalResponded > 0
            ? Math.round((unedited / totalResponded) * 100)
            : 100

        return {
            activeStorefronts: data.active_storefronts || 0,
            reviewsResponded: totalResponded,
            aiApprovalRate,
        }
    } catch (error: unknown) {
        console.error('Failed to read single-row metrics:', error)
        return {
            activeStorefronts: 0,
            reviewsResponded: 0,
            aiApprovalRate: 100,
        }
    }
}