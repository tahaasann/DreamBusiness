import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/health/route'

// Mock Supabase Server Client
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockResolvedValue({
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
        }),
    }),
}))

describe('Production Readiness: Health Check Endpoint Suite', () => {
    it('should return 200 status and healthy JSON payload', async () => {
        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.status).toBe('healthy')
        expect(data.service).toBe('Proficios / Proficios')
        expect(data.database).toBe('connected')
        expect(data.latencyMs).toBeDefined()
    })
})