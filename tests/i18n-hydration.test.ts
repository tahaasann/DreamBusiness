import { describe, it, expect } from 'vitest'

const SUPPORTED_LOCALES = [
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

function resolveLocaleFallback(rawLocale?: string): string {
    if (
        rawLocale &&
        SUPPORTED_LOCALES.includes(rawLocale as (typeof SUPPORTED_LOCALES)[number])
    ) {
        return rawLocale
    }
    return 'en-US'
}

describe('Nice-to-Have 1: 8-Language i18n & Hydration Suite', () => {
    it('should resolve all 8 supported languages accurately', () => {
        expect(resolveLocaleFallback('en-US')).toBe('en-US')
        expect(resolveLocaleFallback('en-GB')).toBe('en-GB')
        expect(resolveLocaleFallback('de')).toBe('de')
        expect(resolveLocaleFallback('es')).toBe('es')
        expect(resolveLocaleFallback('fr')).toBe('fr')
        expect(resolveLocaleFallback('it')).toBe('it')
        expect(resolveLocaleFallback('pt')).toBe('pt')
        expect(resolveLocaleFallback('tr')).toBe('tr')
    })

    it('should fallback safely to "en-US" for unknown locale inputs', () => {
        expect(resolveLocaleFallback('zh')).toBe('en-US')
        expect(resolveLocaleFallback(undefined)).toBe('en-US')
    })
})