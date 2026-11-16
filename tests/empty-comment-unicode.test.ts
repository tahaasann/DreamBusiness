import { describe, it, expect } from 'vitest'
import { sanitizeReviewInput } from '@/lib/sanitizer'
import { buildDraftPrompt } from '@/lib/ai/draft-prompt'

describe('Nice-to-Have 4: Empty Comment & Non-Latin Guardrails Suite', () => {
    // 1. Null / Empty comment handling
    it('should identify empty/null comments safely without throwing errors', () => {
        const nullResult = sanitizeReviewInput(null)
        expect(nullResult.isEmptyComment).toBe(true)
        expect(nullResult.sanitizedText).toBe('')

        const emptyResult = sanitizeReviewInput('   ')
        expect(emptyResult.isEmptyComment).toBe(true)
        expect(emptyResult.sanitizedText).toBe('')
    })

    // 2. Unicode Non-Latin & Emoji Preservation
    it('should preserve non-Latin alphabets and emojis while stripping HTML', () => {
        const unicodeRaw = '<p>素晴らしいカフェ! ☕️🔥 خدمة ممتازة</p>'
        const result = sanitizeReviewInput(unicodeRaw)

        expect(result.sanitizedText).toContain('素晴らしいカフェ!')
        expect(result.sanitizedText).toContain('☕️🔥')
        expect(result.sanitizedText).toContain('خدمة ممتازة')
        expect(result.sanitizedText).not.toContain('<p>')
    })

    // 3. Prompt for Rating-Only Reviews (no network call)
    it('should build a rating-only prompt without inventing comment text', () => {
        const result = buildDraftPrompt({
            businessName: 'Metropolitan Bistro',
            rating: 5,
            comment: null,
            tone: 'friendly',
            language: 'en-US',
            targetKeywords: [],
        })

        expect(result.securityFlags.isEmptyComment).toBe(true)
        expect(result.prompt).toContain('Rating only (no text comment provided).')
        expect(result.system).toContain('do not invent details')
    })
})