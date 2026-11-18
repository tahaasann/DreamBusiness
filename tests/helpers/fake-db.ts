import { vi } from 'vitest'

export type Op = 'select' | 'insert' | 'update' | 'upsert' | 'delete'

export interface RecordedQuery {
    table: string
    op: Op
    values?: unknown
    options?: unknown
    filters: Array<[string, string, unknown]>
}

export type Responder = (query: RecordedQuery) => { data?: unknown; error?: { message: string; code?: string } | null }

/**
 * A small chainable Supabase stand-in that records every query (table, operation,
 * values, filters) and answers through a per-table responder.
 */
export function createFakeDb(responders: Record<string, Responder> = {}, user: { id: string } | null = { id: 'user_a' }) {
    const queries: RecordedQuery[] = []

    const client = {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : { message: 'no session' } }),
        },
        rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
        from: vi.fn((table: string) => {
            const query: RecordedQuery = { table, op: 'select', filters: [] }
            queries.push(query)
            const answer = () => {
                const result = responders[table]?.(query) ?? {}
                return { data: result.data ?? null, error: result.error ?? null }
            }
            const builder: Record<string, unknown> = {}
            const filter = (kind: string) => (column: string, value: unknown) => {
                query.filters.push([kind, column, value])
                return builder
            }
            Object.assign(builder, {
                select: () => builder,
                insert: (values: unknown) => Object.assign(query, { op: 'insert', values }) && builder,
                update: (values: unknown) => Object.assign(query, { op: 'update', values }) && builder,
                upsert: (values: unknown, options: unknown) => Object.assign(query, { op: 'upsert', values, options }) && builder,
                delete: () => Object.assign(query, { op: 'delete' }) && builder,
                eq: filter('eq'),
                not: (column: string, _op: string, value: unknown) => {
                    query.filters.push(['not', column, value])
                    return builder
                },
                order: () => builder,
                limit: () => builder,
                single: () => Promise.resolve(answer()),
                maybeSingle: () => Promise.resolve(answer()),
                then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
                    Promise.resolve(answer()).then(resolve, reject),
            })
            return builder
        }),
    }

    const find = (table: string, op: Op) => queries.filter((q) => q.table === table && q.op === op)
    return { client, queries, find }
}
