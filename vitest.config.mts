import { defineConfig } from 'vitest/config'
import path from 'path'
import fs from 'fs'

// Native dependency-free .env.local loader for Vitest
const envLocalPath = path.resolve(import.meta.dirname, '.env.local')
if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf-8')
    envContent.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
            const equalsIndex = trimmed.indexOf('=')
            if (equalsIndex !== -1) {
                const key = trimmed.substring(0, equalsIndex).trim()
                let val = trimmed.substring(equalsIndex + 1).trim()
                // Strip surrounding quotes
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1)
                }
                if (key && process.env[key] === undefined) {
                    process.env[key] = val
                }
            }
        }
    })
}

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        testTimeout: 15000,
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
})