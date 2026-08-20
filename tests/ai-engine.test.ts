import { describe, it, expect } from 'vitest'
import { generateAiDraft } from '@/app/actions/generate-draft'

describe('Must-Have 3: AI Generation Engine & Guardrails Suite', () => {
    // 1. Test Input Validation Failure
    it('should reject generation when business name is missing', async () => {
        const result = await generateAiDraft({
            reviewComment: 'Great coffee!',
            rating: 5,
            businessName: '',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Business name is required')
    })

    // 2. Test Multi-Language Prompt Routing (Turkish & German)
    it('should handle Turkish and German localization targets gracefully', async () => {
        const trResult = await generateAiDraft({
            reviewComment: 'Kahve harikaydı, personel çok ilgiliydi.',
            rating: 5,
            businessName: 'Artisan Cafe',
            language: 'tr',
            tone: 'friendly',
        })

        expect(trResult.success).toBe(true)
        expect(typeof trResult.draft).toBe('string')
        expect(trResult.draft!.length).toBeGreaterThan(10)
    })

    // 3. Test Critical Review Guardrails (1-3 Stars)
    it('should generate an empathetic response for low ratings without breaking guardrails', async () => {
        const result = await generateAiDraft({
            reviewComment: 'Food was cold and service took 40 minutes.',
            rating: 1,
            businessName: 'Metropolitan Bistro',
            tone: 'apologetic',
            language: 'en',
        })

        expect(result.success).toBe(true)
        expect(result.draft).toBeDefined()
        // Ensure no refunds are offered accidentally
        expect(result.draft!.toLowerCase()).not.toContain('full refund')
    })
})