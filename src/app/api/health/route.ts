import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const startTime = Date.now()
    try {
        const supabase = await createClient()
        // platform_metrics is readable by anonymous visitors; user tables are not.
        const { error } = await supabase.from('platform_metrics').select('id').limit(1)

        if (error) throw error

        const latencyMs = Date.now() - startTime

        return NextResponse.json(
            {
                status: 'healthy',
                service: 'Proficios / Proficios',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                database: 'connected',
                latencyMs,
            },
            { status: 200 }
        )
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Database check failed'
        return NextResponse.json(
            {
                status: 'unhealthy',
                service: 'Proficios / Proficios',
                timestamp: new Date().toISOString(),
                error: message,
            },
            { status: 503 }
        )
    }
}