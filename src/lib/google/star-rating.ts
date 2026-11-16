const STAR_RATINGS: Record<string, number> = {
    FIVE: 5,
    FOUR: 4,
    THREE: 3,
    TWO: 2,
    ONE: 1,
}

/**
 * Converts the Google Business Profile star enum to an integer.
 * Lives outside 'use server' files so it is not exposed as a public server action.
 * Unknown values keep the previous behaviour (5); see report finding O5.
 */
export function parseStarRating(starRating?: string): number {
    return (starRating && STAR_RATINGS[starRating]) || 5
}
