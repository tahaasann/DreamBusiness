import { createClient } from '@/lib/supabase/server'

export async function recordEventBranchCreated() {
    try {
        const supabase = await createClient()
        const { data: current } = await supabase
            .from('platform_metrics')
            .select('active_storefronts')
            .eq('id', 1)
            .single()

        const nextVal = (current?.active_storefronts || 0) + 1

        await supabase
            .from('platform_metrics')
            .update({ active_storefronts: nextVal, updated_at: new Date().toISOString() })
            .eq('id', 1)
    } catch (err: unknown) {
        // Suppress request-store cookie error logs during unit test execution
        if (err instanceof Error && err.message.includes('cookies')) return
        console.error('Failed to record branch creation metric:', err)
    }
}

export async function recordEventDraftGenerated() {
    try {
        const supabase = await createClient()
        const { data: current } = await supabase
            .from('platform_metrics')
            .select('total_drafts_generated')
            .eq('id', 1)
            .single()

        const nextVal = (current?.total_drafts_generated || 0) + 1

        await supabase
            .from('platform_metrics')
            .update({ total_drafts_generated: nextVal, updated_at: new Date().toISOString() })
            .eq('id', 1)
    } catch (err: unknown) {
        // Suppress request-store cookie error logs during unit test execution
        if (err instanceof Error && err.message.includes('cookies')) return
        console.error('Failed to record draft generation metric:', err)
    }
}

export async function recordEventReplyPublished(isEdited: boolean) {
    try {
        const supabase = await createClient()
        const { data: current } = await supabase
            .from('platform_metrics')
            .select('reviews_responded, unedited_drafts_approved')
            .eq('id', 1)
            .single()

        const nextResponses = (current?.reviews_responded || 0) + 1
        const nextUnedited = isEdited
            ? current?.unedited_drafts_approved || 0
            : (current?.unedited_drafts_approved || 0) + 1

        await supabase
            .from('platform_metrics')
            .update({
                reviews_responded: nextResponses,
                unedited_drafts_approved: nextUnedited,
                updated_at: new Date().toISOString(),
            })
            .eq('id', 1)
    } catch (err: unknown) {
        // Suppress request-store cookie error logs during unit test execution
        if (err instanceof Error && err.message.includes('cookies')) return
        console.error('Failed to record reply published metric:', err)
    }
}