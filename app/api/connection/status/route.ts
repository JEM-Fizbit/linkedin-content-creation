import { NextResponse } from 'next/server'
import { isConfigured } from '@/lib/claude'
import type { ConnectionStatus } from '@/types'

// GET /api/connection/status - Check Claude SDK connection status
export async function GET() {
  try {
    const connected = isConfigured()

    const status: ConnectionStatus = {
      connected,
      last_checked: new Date().toISOString(),
    }

    if (!connected) {
      status.error = 'ANTHROPIC_API_KEY not configured in .env.local'
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error checking connection status:', error)
    return NextResponse.json({
      connected: false,
      last_checked: new Date().toISOString(),
      error: 'Failed to check connection',
    } as ConnectionStatus)
  }
}
