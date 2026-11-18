import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret, encryptSecret } from '@/lib/crypto/token-cipher'
import { parseServiceAccount, serializeServiceAccount, type ServiceAccountKey } from './service-account'
import { PlayApiError, playErrorMessage, type PlayErrorCode } from './errors'

/**
 * store_credentials is closed to browsers: only the server (secret key) writes it,
 * and the encrypted column is never readable by a client (task 2.03).
 * Every query here filters by user_id as well, because the admin client bypasses RLS.
 */

export async function saveCredential(
    admin: SupabaseClient,
    userId: string,
    key: ServiceAccountKey
): Promise<{ id: string }> {
    const { data, error } = await admin
        .from('store_credentials')
        .upsert(
            {
                user_id: userId,
                platform: 'google_play',
                service_account_email: key.clientEmail,
                encrypted_key: encryptSecret(serializeServiceAccount(key), 'CREDENTIALS_ENCRYPTION_KEY'),
                key_id: key.privateKeyId,
                last_verified_at: new Date().toISOString(),
                last_error: null,
            },
            { onConflict: 'user_id,platform,service_account_email' }
        )
        .select('id')
        .single()
    if (error || !data) throw new Error(`Saving the credential failed: ${error?.message ?? 'no row'}`)
    return { id: data.id as string }
}

export async function loadCredentialKey(
    admin: SupabaseClient,
    credentialId: string,
    userId: string
): Promise<ServiceAccountKey> {
    const { data, error } = await admin
        .from('store_credentials')
        .select('encrypted_key')
        .eq('id', credentialId)
        .eq('user_id', userId)
        .maybeSingle()
    if (error) throw new Error(`Loading the credential failed: ${error.message}`)
    if (!data?.encrypted_key) throw new PlayApiError('invalid_key', null, 'credential not found')

    const parsed = parseServiceAccount(decryptSecret(data.encrypted_key as string, 'CREDENTIALS_ENCRYPTION_KEY'))
    if (!parsed.ok) throw new PlayApiError('invalid_key', null, parsed.problem)
    return parsed.key
}

/** Records whether the key worked last time, for the connection status in the UI. */
export async function recordCredentialStatus(
    admin: SupabaseClient,
    credentialId: string,
    userId: string,
    failure: PlayErrorCode | null
): Promise<void> {
    const values = failure
        ? { last_error: playErrorMessage(failure).slice(0, 500) }
        : { last_error: null, last_verified_at: new Date().toISOString() }
    const { error } = await admin
        .from('store_credentials')
        .update(values)
        .eq('id', credentialId)
        .eq('user_id', userId)
    if (error) console.error('Recording credential status failed:', error.message)
}
