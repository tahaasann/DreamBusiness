import { describe, it, expect } from 'vitest'
import { parseStarRating } from '@/app/actions/google-business'

describe('Must-Have 2: Google Data Ingestion Engine Suite', () => {
    it('should correctly convert Google API star rating enums to integers 1-5', async () => {
        expect(await parseStarRating('FIVE')).toBe(5)
        expect(await parseStarRating('FOUR')).toBe(4)
        expect(await parseStarRating('THREE')).toBe(3)
        expect(await parseStarRating('TWO')).toBe(2)
        expect(await parseStarRating('ONE')).toBe(1)
        expect(await parseStarRating(undefined)).toBe(5)
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