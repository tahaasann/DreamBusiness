import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import fallbackMessages from '../../messages/en-US.json'

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

type Messages = { [key: string]: string | Messages }

/** Fills any key missing from a translation with the English (US) text. */
function withFallback(base: Messages, override: Messages): Messages {
    const merged: Messages = { ...base }
    for (const [key, value] of Object.entries(override)) {
        const baseValue = base[key]
        merged[key] =
            typeof value === 'object' && typeof baseValue === 'object'
                ? withFallback(baseValue, value)
                : value
    }
    return merged
}

export default getRequestConfig(async () => {
    const cookieStore = await cookies()
    const rawLocale = cookieStore.get('NEXT_LOCALE')?.value || 'en-US'

    const locale: SupportedLocale = SUPPORTED_LOCALES.includes(
        rawLocale as SupportedLocale
    )
        ? (rawLocale as SupportedLocale)
        : 'en-US'

    const fallback = fallbackMessages as Messages
    let messages: Messages = fallback

    if (locale !== 'en-US' && locale !== 'en') {
        try {
            const localeMessages = (await import(`../../messages/${locale}.json`))
                .default as Messages
            messages = withFallback(fallback, localeMessages)
        } catch {
            messages = fallback
        }
    }

    return {
        locale,
        messages,
    }
})
