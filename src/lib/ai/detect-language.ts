import type { DraftLanguage } from '@/lib/ai/draft-options'

type DetectableLanguage = Exclude<DraftLanguage, 'en-GB'>

interface LanguageMarkers {
    words: ReadonlySet<string>
    letters?: RegExp
}

// Short, frequent words and letters that rarely appear in the other languages.
// Good enough to preselect the reply language; the user can always override it.
const MARKERS: Record<DetectableLanguage, LanguageMarkers> = {
    'en-US': {
        words: new Set([
            'the', 'and', 'is', 'it', 'this', 'to', 'not', 'but', 'my', 'was', 'for', 'with',
            'you', 'i', 'great', 'love', 'please', 'since', 'every', 'time', 'app', 'after',
            'update', 'when', 'have', "i've", "it's", "doesn't", "can't", 'just', 'really',
        ]),
    },
    de: {
        words: new Set([
            'der', 'die', 'das', 'und', 'ist', 'nicht', 'ich', 'mit', 'sehr', 'aber', 'auch',
            'eine', 'ein', 'mein', 'meinem', 'funktioniert', 'seit', 'schade', 'sonst', 'wirklich',
            'tolle', 'keine', 'wenn', 'immer', 'noch', 'nach', 'dem', 'den', 'bitte',
        ]),
        letters: /[äöüß]/,
    },
    es: {
        words: new Set([
            'el', 'que', 'y', 'es', 'muy', 'pero', 'me', 'una', 'con', 'para', 'por', 'gusta',
            'falta', 'modo', 'los', 'las', 'del', 'cuando', 'esta', 'está', 'aplicación', 'nada',
        ]),
        letters: /[ñ¿¡]/,
    },
    fr: {
        words: new Set([
            'le', 'les', 'et', 'est', 'pas', 'je', 'très', 'mais', 'une', 'pour', 'avec', 'mes',
            'impossible', 'ne', 'des', 'du', 'au', 'sur', 'cette', 'appli', 'depuis', 'mon', 'vous',
        ]),
        letters: /[œ]|\b(?:c'est|j'ai|n'est|l'app)\b/,
    },
    it: {
        words: new Set([
            'il', 'che', 'non', 'è', 'molto', 'ma', 'per', 'mi', 'piacerebbe', 'ottima', 'ottimo',
            'di', 'gli', 'sono', 'questa', 'anche', 'dati', 'poter', 'della', 'nel',
        ]),
        letters: /[ìò]/,
    },
    pt: {
        words: new Set([
            'o', 'não', 'muito', 'mas', 'com', 'você', 'melhor', 'já', 'usei', 'bonito', 'ajudou',
            'verdade', 'uma', 'do', 'da', 'meu', 'minha', 'isso', 'aplicativo', 'em', 'os',
        ]),
        letters: /[ãõ]/,
    },
    tr: {
        words: new Set([
            've', 'bir', 'bu', 'çok', 'ama', 'için', 'değil', 'ile', 'uygulama', 'olsa', 'güzel',
            'biraz', 'harika', 'olurdu', 'neden', 'gibi', 'daha', 'hiç', 'sonra', 'var', 'yok',
        ]),
        letters: /[ğışı]/,
    },
}

export interface LanguageGuess {
    language: DraftLanguage
    /** False when nothing in the text pointed to a language and `fallback` was used. */
    detected: boolean
}

/**
 * Guesses which supported language a review is written in.
 * English reviews follow `fallback` when it is British English.
 */
export function detectReviewLanguage(
    text: string | null | undefined,
    fallback: DraftLanguage = 'en-US',
): LanguageGuess {
    const lower = (text ?? '').toLocaleLowerCase()
    const tokens = lower.split(/[^\p{L}']+/u).filter(Boolean)
    if (tokens.length === 0) return { language: fallback, detected: false }

    let best: DetectableLanguage | null = null
    let bestScore = 0
    let tie = false

    for (const [language, markers] of Object.entries(MARKERS) as [DetectableLanguage, LanguageMarkers][]) {
        let score = 0
        for (const token of tokens) if (markers.words.has(token)) score += 1
        if (markers.letters?.test(lower)) score += 3

        if (score > bestScore) {
            best = language
            bestScore = score
            tie = false
        } else if (score === bestScore && score > 0) {
            tie = true
        }
    }

    if (!best || bestScore < 2 || tie) return { language: fallback, detected: false }
    if (best === 'en-US' && fallback === 'en-GB') return { language: 'en-GB', detected: true }
    return { language: best, detected: true }
}
