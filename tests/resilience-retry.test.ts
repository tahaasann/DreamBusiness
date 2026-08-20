import { describe, it, expect, vi } from 'vitest'
import { executeWithRetry } from '@/lib/resilience'

describe('Nice-to-Have 3: API Resilience & Exponential Backoff Suite', () => {
    // 1. Successful operation without retries
    it('should return result immediately on first successful execution', async () => {
        const mockOperation = vi.fn().mockResolvedValue('SUCCESS')

        const result = await executeWithRetry(mockOperation)

        expect(result).toBe('SUCCESS')
        expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    // 2. Retry on 429 status and succeed on 2nd attempt
    it('should retry transient 429 rate-limit errors and succeed', async () => {
        const mockOperation = vi
            .fn()
            .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
            .mockResolvedValueOnce('RECOVERY_SUCCESS')

        const result = await executeWithRetry(mockOperation, {
            baseDelayMs: 10,
            maxRetries: 2,
        })

        expect(result).toBe('RECOVERY_SUCCESS')
        expect(mockOperation).toHaveBeenCalledTimes(2)
    })

    // 3. Stop retrying immediately on 401 Unauthorized
    it('should fail fast and not retry un-retryable 401 status errors', async () => {
        const mockOperation = vi
            .fn()
            .mockRejectedValue({ status: 401, message: 'Unauthorized' })

        await expect(
            executeWithRetry(mockOperation, { baseDelayMs: 10, maxRetries: 3 })
        ).rejects.toEqual({ status: 401, message: 'Unauthorized' })

        expect(mockOperation).toHaveBeenCalledTimes(1) // No retries for 401
    })
})