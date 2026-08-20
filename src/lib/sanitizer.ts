export interface SanitizedInput {
    sanitizedText: string
    isEmptyComment: boolean
    isInjectionDetected: boolean
    hasScriptTags: boolean
}

// Adversarial prompt injection signatures
const INJECTION_PATTERNS = [
    /ignore (all )?previous instructions/i,
    /system prompt/i,
    /you are now/i,
    /override (the )?system/i,
    /act as (an? )?admin/i,
    /bypass guardrails/i,
]

export function sanitizeReviewInput(
    rawText: string | null | undefined,
    maxLength = 1000
): SanitizedInput {
    if (!rawText || rawText.trim() === '') {
        return {
            sanitizedText: '',
            isEmptyComment: true,
            isInjectionDetected: false,
            hasScriptTags: false,
        }
    }

    // 1. Detect HTML / Script tag injection
    const hasScriptTags =
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(rawText) ||
        /<[^>]+>/g.test(rawText)

    // Strip HTML tags while preserving all Unicode characters (CJK, Cyrillic, Arabic, Emojis)
    let cleanText = rawText.replace(/<[^>]*>?/gm, '')

    // 2. Detect & Neutralize Prompt Injection Attempts
    const isInjectionDetected = INJECTION_PATTERNS.some((pattern) => pattern.test(cleanText))

    if (isInjectionDetected) {
        cleanText = cleanText.replace(
            /(ignore|override|system prompt|you are now|bypass guardrails)[^.]*/gi,
            '[FILTERED_ADVERSARIAL_TEXT]'
        )
    }

    // 3. Enforce maximum input length cap
    if (cleanText.length > maxLength) {
        cleanText = cleanText.slice(0, maxLength)
    }

    return {
        sanitizedText: cleanText.trim(),
        isEmptyComment: cleanText.trim() === '',
        isInjectionDetected,
        hasScriptTags,
    }
}