import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirectBaseUrl, safeRedirectPath } from '@/lib/auth/safe-redirect'
import { storeGoogleTokens } from '@/lib/google/tokens'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // `next` comes from the URL and is untrusted: only same-origin paths are allowed.
    const nextPath = safeRedirectPath(searchParams.get('next'))

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Google returns the refresh token only now; keep it so Google features
            // keep working after the one-hour access token expires.
            const session = data?.session
            if (session?.provider_refresh_token && data?.user) {
                try {
                    await storeGoogleTokens(data.user.id, {
                        accessToken: session.provider_token,
                        refreshToken: session.provider_refresh_token,
                    })
                } catch (storeError: unknown) {
                    // Login still succeeds; Google features will ask the user to reconnect.
                    console.error('Could not store Google tokens after login:', storeError)
                }
            }

            const base = redirectBaseUrl(origin, request.headers.get('x-forwarded-host'))
            return NextResponse.redirect(new URL(nextPath, base))
        }
    }

    // Return the user to an error page if auth fails
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
}
