import { vi } from 'vitest'

type Row = Record<string, unknown>

export interface SupabaseMockOptions {
    /** Signed-in user, or null for an anonymous request. */
    user?: { id: string; email?: string } | null
    /** Value returned by rpc('consume_rate_limit'). */
    rateLimitAllowed?: boolean
    /** Error returned by rpc(), e.g. when the SQL was not applied. */
    rpcError?: { message: string } | null
    /** Row returned for each table by single()/maybeSingle()/limit(). */
    tables?: Record<string, Row | null>
    /** Error returned by every query on the given table. */
    tableErrors?: Record<string, { message: string }>
    providerToken?: string | null
}

/**
 * Minimal chainable stand-in for the Supabase server client.
 * Every query builder method returns the builder; terminal methods resolve
 * with the row configured for that table.
 */
export function createSupabaseMock(options: SupabaseMockOptions = {}) {
    const {
        user = { id: 'user_owner_1', email: 'owner@bistro.test' },
        rateLimitAllowed = true,
        rpcError = null,
        tables = {},
        tableErrors = {},
        providerToken = null,
    } = options

    const calls = {
        rpc: [] as Array<{ fn: string; args: unknown }>,
        from: [] as string[],
        inserts: [] as Array<{ table: string; values: unknown }>,
        updates: [] as Array<{ table: string; values: unknown }>,
        upserts: [] as Array<{ table: string; values: unknown }>,
        deletes: [] as string[],
    }

    const client = {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : { message: 'no session' } }),
            getSession: vi.fn().mockResolvedValue({
                data: { session: user ? { provider_token: providerToken } : null },
            }),
        },
        rpc: vi.fn(async (fn: string, args: unknown) => {
            calls.rpc.push({ fn, args })
            if (rpcError) return { data: null, error: rpcError }
            return { data: rateLimitAllowed, error: null }
        }),
        from: vi.fn((table: string) => {
            calls.from.push(table)
            const error = tableErrors[table] ?? null
            const row = error ? null : (tables[table] ?? null)
            const result = { data: row, error }
            const builder: Record<string, unknown> = {}
            const chain = () => builder
            Object.assign(builder, {
                select: chain,
                eq: chain,
                in: chain,
                order: chain,
                insert: (values: unknown) => {
                    calls.inserts.push({ table, values })
                    return builder
                },
                update: (values: unknown) => {
                    calls.updates.push({ table, values })
                    return builder
                },
                upsert: (values: unknown) => {
                    calls.upserts.push({ table, values })
                    return builder
                },
                delete: () => {
                    calls.deletes.push(table)
                    return builder
                },
                limit: () => Promise.resolve({ data: row ? [row] : [], error }),
                single: () => Promise.resolve(result),
                maybeSingle: () => Promise.resolve(result),
                then: (resolve: (value: unknown) => unknown) => resolve({ data: row, error, count: 0 }),
            })
            return builder
        }),
    }

    return { client, calls }
}
