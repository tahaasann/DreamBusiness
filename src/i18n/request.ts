import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const SUPPORTED_LOCALES = [
    'en',
    'en-US',
    'en-GB',
    'de',
    'es',
    'fr',
    'it',
    'pt',
    'tr',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export default getRequestConfig(async () => {
    const cookieStore = await cookies()
    const rawLocale = cookieStore.get('NEXT_LOCALE')?.value || 'en-US'

    const locale: SupportedLocale = SUPPORTED_LOCALES.includes(
        rawLocale as SupportedLocale
    )
        ? (rawLocale as SupportedLocale)
        : 'en-US'

    let messages: Record<string, unknown>

    try {
        messages = (await import(`../../messages/${locale}.json`)).default
    } catch {
        try {
            messages = (await import('../../messages/en-US.json')).default
        } catch {
            messages = (await import('../../messages/en-US.json')).default
        }
    }

    return {
        locale,
        messages,
    }
})