import 'server-only'
import crypto from 'crypto'

const FORMAT_VERSION = 'v1'

function getKey(): Buffer {
    const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
    if (!raw) {
        throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is not set')
    }
    const key = Buffer.from(raw, 'base64')
    if (key.length !== 32) {
        throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 random bytes encoded as base64')
    }
    return key
}

/**
 * AES-256-GCM. Output: "v1:<iv>:<auth tag>:<ciphertext>" (base64 parts).
 * A database dump alone is not enough to use the stored Google tokens.
 */
export function encryptSecret(plainText: string): string {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
    const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [FORMAT_VERSION, iv.toString('base64'), tag.toString('base64'), cipherText.toString('base64')].join(':')
}

export function decryptSecret(payload: string): string {
    const [version, iv, tag, cipherText] = payload.split(':')
    if (version !== FORMAT_VERSION || !iv || !tag || !cipherText) {
        throw new Error('Unsupported encrypted token format')
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([
        decipher.update(Buffer.from(cipherText, 'base64')),
        decipher.final(),
    ]).toString('utf8')
}
