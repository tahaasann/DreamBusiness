import { describe, it, expect } from 'vitest'
import { sanitizeReviewInput } from '@/lib/sanitizer'
import { generateAiDraft } from '@/app/actions/generate-draft'

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

    // 3. AI Generation for Rating-Only Reviews
    it('should generate a draft for rating-only reviews without comment text', async () => {
        const result = await generateAiDraft({
            reviewComment: null as unknown as string,
            rating: 5,
            businessName: 'Metropolitan Bistro',
            language: 'en',
        })

        expect(result.success).toBe(true)
        expect(result.securityFlags?.isEmptyComment).toBe(true)
        expect(result.draft).toBeDefined()
    })
})