export interface SanitizedInput {
    sanitizedText: string
    isEmptyComment: boolean
    isInjectionDetected: boolean
    hasScriptTags: boolean
}

/**
 * Phrases that only make sense as an attempt to steer the model. Each pattern
 * needs the instruction-like context around it, so ordinary reviews such as
 * "you are now my favourite app" or "the system prompt to rate was annoying"
 * are left alone (finding Y5).
 */
const INJECTION_PATTERNS: RegExp[] = [
    /\b(?:ignore|disregard|forget)\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|rules?|messages?)[^.!?\n]*/gi,
    /\b(?:reveal|print|show|repeat|output)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+prompt|instructions|hidden\s+rules)[^.!?\n]*/gi,
    /\byou\s+are\s+now\s+(?:an?\s+)?(?:ai|assistant|chatbot|language\s+model|admin(?:istrator)?|developer\s+mode|dan|jailbroken|unrestricted|in\s+(?:developer|debug|admin)\s+mode)\b[^.!?\n]*/gi,
    /\boverride\s+(?:the\s+|your\s+)?(?:system|instructions|rules|guardrails)[^.!?\n]*/gi,
    /\bact\s+as\s+(?:an?\s+)?(?:admin(?:istrator)?|system|developer|root)\b[^.!?\n]*/gi,
    /\bbypass\s+(?:the\s+|your\s+)?(?:guardrails|filters|rules|safety)[^.!?\n]*/gi,
    /\bnew\s+instructions\s*:[^\n]*/gi,
]

/** Real markup only: "<b>", "</review>", "<script src=…>". "<3" and "a < b" are text. */
const HTML_TAG = /<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?\/?>/gi
const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi

export function sanitizeReviewInput(rawText: string | null | undefined, maxLength = 1000): SanitizedInput {
    if (!rawText || rawText.trim() === '') {
        return { sanitizedText: '', isEmptyComment: true, isInjectionDetected: false, hasScriptTags: false }
    }

    // 1. Markup. Script contents are kept as plain text (they are harmless data for
    //    the model) but the tags go, so the review cannot close our <review> block.
    const hasScriptTags = new RegExp(SCRIPT_BLOCK.source, 'i').test(rawText) || new RegExp(HTML_TAG.source, 'i').test(rawText)
    let cleanText = rawText.replace(HTML_TAG, '')

    // 2. Instruction-like phrases are replaced; the rest of the review stays intact.
    let isInjectionDetected = false
    for (const pattern of INJECTION_PATTERNS) {
        cleanText = cleanText.replace(pattern, () => {
            isInjectionDetected = true
            return '[FILTERED_ADVERSARIAL_TEXT]'
        })
    }

    // 3. Length cap (by code point, so an emoji is never cut in half).
    const characters = Array.from(cleanText)
    if (characters.length > maxLength) cleanText = characters.slice(0, maxLength).join('')

    const sanitizedText = cleanText.trim()
    return {
        sanitizedText,
        isEmptyComment: sanitizedText === '',
        isInjectionDetected,
        hasScriptTags,
    }
}
