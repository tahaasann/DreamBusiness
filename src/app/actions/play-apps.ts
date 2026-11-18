'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth/require-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { consumeRateLimit, RATE_LIMITS, rateLimitMessage } from '@/lib/rate-limit'
import { recordEventBranchCreated } from '@/lib/metrics-tracker'
import { clearPlayTokenCache } from '@/lib/play/auth'
import { APP_COLUMNS, REVIEW_COLUMNS, type AppItem, type ReviewItem } from '@/lib/play/types'

type Failure = { success: false; error: string }
const SIGN_IN: Failure = { success: false, error: 'You need to sign in first.' }

const DEMO_APPS = [
    { name: 'Fernly: Budget & Savings', pkg: 'com.proficios.demo.fernly' },
    { name: 'Lumen Weather', pkg: 'com.proficios.demo.lumen' },
    { name: 'Habitly: Daily Habits', pkg: 'com.proficios.demo.habitly' },
]

const DEMO_REVIEWS = [
    {
        author: 'Jordan Price', stars: 1, lang: 'en', minutes: 2, version: ['4.2.0', 420], device: 'Pixel 8', api: 35, thumbs: 12,
        text: "Since the last update the app crashes every time I open Reports. I've used it daily for two years, please fix this.",
    },
    {
        author: 'Lena Wagner', stars: 2, lang: 'de', minutes: 14, version: ['4.2.0', 420], device: 'Galaxy S24', api: 34, thumbs: 3,
        text: 'Die Synchronisierung mit meinem Tablet funktioniert seit Tagen nicht. Schade, sonst wirklich eine tolle App!',
    },
    {
        author: 'Elif Kaya', stars: 3, lang: 'tr', minutes: 52, version: ['4.1.8', 418], device: 'Redmi Note 13', api: 34, thumbs: 1,
        text: 'Uygulama çok güzel ama abonelik fiyatı biraz yüksek. Öğrenci indirimi olsa harika olurdu.',
    },
    {
        author: 'Marco Bianchi', stars: 4, lang: 'it', minutes: 190, version: ['4.2.0', 420], device: 'Pixel 7a', api: 34, thumbs: 0,
        text: 'Ottima app, ma mi piacerebbe poter esportare i dati in CSV.',
    },
    {
        author: 'Rafael Souza', stars: 5, lang: 'pt_BR', minutes: 1440, version: ['4.1.8', 418], device: 'Moto G84', api: 33, thumbs: 5,
        text: 'Melhor app de finanças que já usei. Simples, bonito e me ajudou a economizar de verdade!',
    },
] as const

export type DemoAppResult = { success: true; app: AppItem; reviews: ReviewItem[] } | Failure

/** A demo app with realistic Play reviews, for trying Proficios without a connection (task 4.09). */
export async function createDemoPlayApp(): Promise<DemoAppResult> {
    try {
        const auth = await requireUser()
        if (!auth.ok) return SIGN_IN
        const { supabase, user } = auth

        const limit = await consumeRateLimit(supabase, RATE_LIMITS.demoBranch)
        if (!limit.allowed) return { success: false, error: rateLimitMessage(limit.reason) }

        const { data: existing } = await supabase.from('apps').select('package_name').eq('user_id', user.id).eq('is_demo', true)
        const taken = new Set((existing ?? []).map((row) => row.package_name as string))
        const demo = DEMO_APPS.find((candidate) => !taken.has(candidate.pkg))
        if (!demo) return { success: false, error: 'You already have every demo app.' }

        const { data: app, error } = await supabase
            .from('apps')
            .insert({
                user_id: user.id,
                platform: 'google_play',
                package_name: demo.pkg,
                display_name: demo.name,
                default_tone: 'friendly',
                is_demo: true,
            })
            .select(APP_COLUMNS)
            .single()
        if (error || !app) throw error ?? new Error('demo app insert returned nothing')

        const now = Date.now()
        const { data: reviews, error: reviewError } = await supabase
            .from('app_reviews')
            .insert(
                DEMO_REVIEWS.map((sample, index) => ({
                    user_id: user.id,
                    app_id: app.id,
                    store_review_id: `demo:${demo.pkg}:${index + 1}`,
                    author_name: sample.author,
                    star_rating: sample.stars,
                    review_text: sample.text,
                    reviewer_language: sample.lang,
                    app_version_name: sample.version[0],
                    app_version_code: sample.version[1],
                    device: sample.device,
                    android_os_version: sample.api,
                    thumbs_up_count: sample.thumbs,
                    review_updated_at: new Date(now - sample.minutes * 60_000).toISOString(),
                }))
            )
            .select(REVIEW_COLUMNS)
        if (reviewError) throw reviewError

        await recordEventBranchCreated()
        return { success: true, app: app as unknown as AppItem, reviews: (reviews ?? []) as unknown as ReviewItem[] }
    } catch (error: unknown) {
        console.error('createDemoPlayApp failed:', error)
        return { success: false, error: 'Could not create the demo app. Please try again.' }
    }
}

/** Removes an app with its reviews and reply history (cascade). */
export async function removePlayApp(appId: string): Promise<{ success: true } | Failure> {
    try {
        const auth = await requireUser()
        if (!auth.ok) return SIGN_IN
        if (!z.string().uuid().safeParse(appId).success) return { success: false, error: 'App not found.' }

        const { data, error } = await auth.supabase
            .from('apps')
            .delete()
            .eq('id', appId)
            .eq('user_id', auth.user.id)
            .select('id')
        if (error) throw error
        if (!data?.length) return { success: false, error: 'App not found.' }
        return { success: true }
    } catch (error: unknown) {
        console.error('removePlayApp failed:', error)
        return { success: false, error: 'Could not remove the app. Please try again.' }
    }
}

/**
 * Deletes the stored service-account key (task 4.11). Apps stay with their
 * reviews but lose their connection; with removeData they are deleted too.
 */
export async function disconnectPlayAccount(
    credentialId: string,
    { removeData = false }: { removeData?: boolean } = {}
): Promise<{ success: true; removedAppIds: string[] } | Failure> {
    try {
        const auth = await requireUser()
        if (!auth.ok) return SIGN_IN
        if (!z.string().uuid().safeParse(credentialId).success) return { success: false, error: 'Connection not found.' }
        const { supabase, user } = auth

        let removedAppIds: string[] = []
        if (removeData) {
            const { data, error } = await supabase
                .from('apps')
                .delete()
                .eq('credential_id', credentialId)
                .eq('user_id', user.id)
                .select('id')
            if (error) throw error
            removedAppIds = (data ?? []).map((row) => row.id as string)
        }

        const { data: deleted, error } = await createAdminClient()
            .from('store_credentials')
            .delete()
            .eq('id', credentialId)
            .eq('user_id', user.id)
            .select('id')
        if (error) throw error
        if (!deleted?.length) return { success: false, error: 'Connection not found.' }

        clearPlayTokenCache()
        return { success: true, removedAppIds }
    } catch (error: unknown) {
        console.error('disconnectPlayAccount failed:', error)
        return { success: false, error: 'Could not remove the connection. Please try again.' }
    }
}
