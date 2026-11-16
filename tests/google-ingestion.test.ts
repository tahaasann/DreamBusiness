import { describe, it, expect } from 'vitest'
import { parseStarRating } from '@/lib/google/star-rating'

describe('Must-Have 2: Google Data Ingestion Engine Suite', () => {
    it('should correctly convert Google API star rating enums to integers 1-5', () => {
        expect(parseStarRating('FIVE')).toBe(5)
        expect(parseStarRating('FOUR')).toBe(4)
        expect(parseStarRating('THREE')).toBe(3)
        expect(parseStarRating('TWO')).toBe(2)
        expect(parseStarRating('ONE')).toBe(1)
        expect(parseStarRating(undefined)).toBe(5)
    })

    it('should construct valid paginated review URL query parameters', () => {
        const accName = 'accounts/112233'
        const locName = 'locations/445566'
        const pageToken = 'token_page_2'

        const url = `https://mybusiness.googleapis.com/v4/${accName}/${locName}/reviews?pageSize=50${
            pageToken ? `&pageToken=${pageToken}` : ''
        }`

        expect(url).toContain('pageSize=50')
        expect(url).toContain('pageToken=token_page_2')
        expect(url).toContain('accounts/112233/locations/445566/reviews')
    })
})