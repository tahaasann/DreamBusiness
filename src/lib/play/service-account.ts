import crypto from 'crypto'

/** The fields of a Google service-account JSON key that Proficios uses. */
export interface ServiceAccountKey {
    clientEmail: string
    privateKey: string
    privateKeyId: string | null
    projectId: string | null
}

export type ServiceAccountProblem =
    | 'empty'
    | 'too_large'
    | 'not_json'
    | 'not_service_account'
    | 'missing_email'
    | 'missing_private_key'
    | 'bad_private_key'

export type ParseServiceAccountResult =
    | { ok: true; key: ServiceAccountKey }
    | { ok: false; problem: ServiceAccountProblem }

/** Real keys are about 2.3 KB; anything far larger is not a key file. */
const MAX_KEY_FILE_BYTES = 16 * 1024

/**
 * Checks an uploaded service-account JSON before it is encrypted and stored
 * (task 2.02). It does not contact Google; getPlayAccessToken() does that.
 */
export function parseServiceAccount(raw: string): ParseServiceAccountResult {
    const text = raw.trim()
    if (!text) return { ok: false, problem: 'empty' }
    if (Buffer.byteLength(text, 'utf8') > MAX_KEY_FILE_BYTES) return { ok: false, problem: 'too_large' }

    let json: unknown
    try {
        json = JSON.parse(text)
    } catch {
        return { ok: false, problem: 'not_json' }
    }
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
        return { ok: false, problem: 'not_json' }
    }

    const data = json as Record<string, unknown>
    if (data.type !== 'service_account') return { ok: false, problem: 'not_service_account' }

    const clientEmail = typeof data.client_email === 'string' ? data.client_email.trim() : ''
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail) || clientEmail.length > 320) {
        return { ok: false, problem: 'missing_email' }
    }

    const privateKey = typeof data.private_key === 'string' ? data.private_key : ''
    if (!privateKey.includes('PRIVATE KEY')) return { ok: false, problem: 'missing_private_key' }
    try {
        const key = crypto.createPrivateKey(privateKey)
        if (key.asymmetricKeyType !== 'rsa') return { ok: false, problem: 'bad_private_key' }
    } catch {
        return { ok: false, problem: 'bad_private_key' }
    }

    const privateKeyId =
        typeof data.private_key_id === 'string' && data.private_key_id.length <= 100 ? data.private_key_id : null
    const projectId = typeof data.project_id === 'string' ? data.project_id : null

    return { ok: true, key: { clientEmail, privateKey, privateKeyId, projectId } }
}

const PROBLEM_MESSAGES: Record<ServiceAccountProblem, string> = {
    empty: 'Choose the JSON key file you downloaded from Google Cloud.',
    too_large: 'This file is too large to be a service-account key.',
    not_json: 'This file is not valid JSON. Upload the .json key file exactly as Google Cloud downloaded it.',
    not_service_account: 'This is not a service-account key. In Google Cloud, create a key for a service account (type JSON).',
    missing_email: 'The key file has no client_email. Download a new JSON key for the service account.',
    missing_private_key: 'The key file has no private key. Download a new JSON key for the service account.',
    bad_private_key: 'The private key in this file is damaged. Download a new JSON key for the service account.',
}

export function serviceAccountProblemMessage(problem: ServiceAccountProblem): string {
    return PROBLEM_MESSAGES[problem]
}

/** Serialises only the fields needed later, so stored ciphertext stays small. */
export function serializeServiceAccount(key: ServiceAccountKey): string {
    return JSON.stringify({
        type: 'service_account',
        client_email: key.clientEmail,
        private_key: key.privateKey,
        private_key_id: key.privateKeyId,
        project_id: key.projectId,
    })
}
