// Shared by the server prompt builder and the browser UI, so it must stay free
// of server-only imports.

export const DRAFT_TONES = ['professional', 'friendly', 'apologetic', 'casual'] as const
export type DraftTone = (typeof DRAFT_TONES)[number]

export const DRAFT_LANGUAGES = ['en-US', 'en-GB', 'de', 'es', 'fr', 'it', 'pt', 'tr'] as const
export type DraftLanguage = (typeof DRAFT_LANGUAGES)[number]

/** Google Play's maximum length for a developer reply. */
export const REPLY_CHAR_LIMIT = 350

export function isDraftTone(value: unknown): value is DraftTone {
    return typeof value === 'string' && (DRAFT_TONES as readonly string[]).includes(value)
}

export function isDraftLanguage(value: unknown): value is DraftLanguage {
    return typeof value === 'string' && (DRAFT_LANGUAGES as readonly string[]).includes(value)
}
