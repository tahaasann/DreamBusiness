import { defineConfig } from 'vitest/config'
import path from 'path'

// Tests are hermetic: .env.local is deliberately NOT loaded, so no test can reach
// the real Supabase (with the secret key), Gemini, Paddle or Google APIs.
// Each test sets the environment variables it needs and mocks external clients.

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        testTimeout: 15000,
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
            'server-only': path.resolve(import.meta.dirname, './tests/stubs/server-only.ts'),
        },
    },
})