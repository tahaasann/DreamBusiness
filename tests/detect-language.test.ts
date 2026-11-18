import { describe, expect, it } from 'vitest'
import { detectReviewLanguage } from '@/lib/ai/detect-language'

describe('detectReviewLanguage', () => {
    it.each([
        ['Since the last update the app crashes every time I open Reports. Please fix this.', 'en-US'],
        ['Die Synchronisierung mit meinem Tablet funktioniert seit Tagen nicht. Schade, sonst wirklich eine tolle App!', 'de'],
        ['Uygulama çok güzel ama abonelik fiyatı biraz yüksek. Öğrenci indirimi olsa harika olurdu.', 'tr'],
        ['Melhor app de finanças que já usei. Simples, bonito e me ajudou a economizar de verdade!', 'pt'],
        ['Me gusta mucho, pero falta el modo oscuro y la aplicación se cierra a veces.', 'es'],
        ["Impossible de restaurer mes achats depuis la mise à jour, c'est très frustrant.", 'fr'],
        ['Ottima app, ma mi piacerebbe poter esportare i dati in CSV.', 'it'],
    ])('detects %s', (text, expected) => {
        expect(detectReviewLanguage(text)).toEqual({ language: expected, detected: true })
    })

    it('keeps British English when the fallback is en-GB', () => {
        expect(detectReviewLanguage('The app is great but it crashes after the update.', 'en-GB')).toEqual({
            language: 'en-GB',
            detected: true,
        })
    })

    it('falls back when the text gives no clear signal', () => {
        expect(detectReviewLanguage(null, 'de')).toEqual({ language: 'de', detected: false })
        expect(detectReviewLanguage('', 'tr')).toEqual({ language: 'tr', detected: false })
        expect(detectReviewLanguage('👍👍👍', 'fr')).toEqual({ language: 'fr', detected: false })
        expect(detectReviewLanguage('OK', 'es')).toEqual({ language: 'es', detected: false })
    })
})
