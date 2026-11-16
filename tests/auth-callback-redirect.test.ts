import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/auth/callback/route'
import { safeRedirectPath, redirectBaseUrl } from '@/lib/auth/safe-redirect'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('safeRedirectPath', () => {
    it.each([
        ['/dashboard', '/dashboard'],
        ['/dashboard?tab=reviews#latest', '/dashboard?tab=reviews#latest'],
        [null, '/dashboard'],
        ['', '/dashboard'],
    ])('keeps same-origin path %s', (input, expected) => {
        expect(safeRedirectPath(input)).toBe(expected)
    })

    it.each([
        '@evil.example',
        '.evil.example/x',
        '//evil.example',
        '/\\evil.example',
        '/\t/evil.example',
        'https://evil.example/dashboard',
        'javascript:alert(1)',
    ])('blocks escape attempt %s', (input) => {
        expect(safeRedirectPath(input)).toBe('/dashboard')
    })
})

describe('redirectBaseUrl', () => {
    it('ignores forwarded hosts that are not plain host names', () => {
        expect(redirectBaseUrl('https://proficios.com', 'evil.example@attacker')).toBe('https://proficios.com')
        expect(redirectBaseUrl('https://proficios.com', null)).toBe('https://proficios.com')
    })
})

describe('GET /auth/callback', () => {
    beforeEach(() => {
        vi.mocked(createClient).mockResolvedValue({
            auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
        } as never)
    })

    it.each(['@evil.example', '.evil.example/x', '//evil.example'])(
        'keeps the user on the site when next=%s',
        async (next) => {
            const url = `https://proficios.com/auth/callback?code=abc&next=${encodeURIComponent(next)}`
            const res = await GET(new Request(url))

            const location = new URL(res.headers.get('location')!)
            expect(location.host).toBe('proficios.com')
            expect(location.pathname).toBe('/dashboard')
        }
    )

    it('honours a legitimate next path', async () => {
        const res = await GET(new Request('https://proficios.com/auth/callback?code=abc&next=%2Fdashboard%3Ftab%3Dreplied'))
        expect(res.headers.get('location')).toBe('https://proficios.com/dashboard?tab=replied')
    })

    it('sends failed logins back to the login page', async () => {
        vi.mocked(createClient).mockResolvedValue({
            auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: { message: 'bad code' } }) },
        } as never)

        const res = await GET(new Request('https://proficios.com/auth/callback?code=bad'))
        expect(res.headers.get('location')).toBe('https://proficios.com/login?error=auth_failed')
    })
})
