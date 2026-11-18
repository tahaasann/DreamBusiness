import crypto from 'crypto'

/** One RSA key pair per test run, used to build realistic service-account files. */
export const { privateKey: testPrivateKey, publicKey: testPublicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
})

export const TEST_PRIVATE_KEY_PEM = testPrivateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

export const TEST_CLIENT_EMAIL = 'replies@proficios-test.iam.gserviceaccount.com'

export function serviceAccountJson(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        type: 'service_account',
        project_id: 'proficios-test',
        private_key_id: 'kid123',
        private_key: TEST_PRIVATE_KEY_PEM,
        client_email: TEST_CLIENT_EMAIL,
        ...overrides,
    })
}
