export interface RetryOptions {
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
    retryableStatuses?: number[]
}

export async function executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelayMs = 100,
        maxDelayMs = 2000,
        retryableStatuses = [429, 500, 502, 503, 504],
    } = options

    let lastError: unknown

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error: unknown) {
            lastError = error

            if (attempt === maxRetries) {
                break
            }

            // Extract HTTP status if present
            const status =
                (error as { status?: number; statusCode?: number })?.status ||
                (error as { status?: number; statusCode?: number })?.statusCode

            const isRetryableStatus = status ? retryableStatuses.includes(status) : true

            // Stop retrying immediately if it's an un-retryable error (e.g., 401 Unauthorized)
            if (!isRetryableStatus) {
                throw error
            }

            // Calculate exponential delay + jitter
            const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
            const jitter = Math.random() * 50
            const delay = Math.min(maxDelayMs, exponentialDelay + jitter)

            await new Promise((resolve) => setTimeout(resolve, delay))
        }
    }

    throw lastError
}