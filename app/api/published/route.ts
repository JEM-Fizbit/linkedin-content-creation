import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Session } from '@/types'

interface PerformanceNote {
  id: string
  session_id: string
  views: number | null
  likes: number | null
  comments: number | null
  reposts: number | null
  notes: string
  recorded_at: string
}

export interface PublishedSession extends Session {
  performance: PerformanceNote | null
}

// GET /api/published - Get all published sessions with performance metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sortBy') || 'published_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Validate sort parameters
    const validSortFields = ['published_at', 'views', 'likes', 'comments', 'reposts']
    const validSortOrders = ['asc', 'desc']

    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json(
        { error: 'Invalid sortBy parameter' },
        { status: 400 }
      )
    }

    if (!validSortOrders.includes(sortOrder)) {
      return NextResponse.json(
        { error: 'Invalid sortOrder parameter' },
        { status: 400 }
      )
    }

    // Get all published sessions
    const sessionsStmt = db.prepare(`
      SELECT * FROM sessions
      WHERE status = 'published'
      ORDER BY published_at DESC
    `)
    const sessions = sessionsStmt.all() as Session[]

    // Get performance notes for all these sessions
    const performanceStmt = db.prepare('SELECT * FROM performance_notes WHERE session_id = ?')

    const publishedSessions: PublishedSession[] = sessions.map(session => {
      const performance = performanceStmt.get(session.id) as PerformanceNote | undefined
      return {
        ...session,
        performance: performance || null,
      }
    })

    // Sort by the requested field
    publishedSessions.sort((a, b) => {
      let aVal: number | string | null
      let bVal: number | string | null

      if (sortBy === 'published_at') {
        aVal = a.published_at || ''
        bVal = b.published_at || ''
      } else {
        // Sort by performance metrics
        aVal = a.performance?.[sortBy as keyof PerformanceNote] as number | null ?? null
        bVal = b.performance?.[sortBy as keyof PerformanceNote] as number | null ?? null
      }

      // Handle nulls - put them at the end
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      // Compare values
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    return NextResponse.json({ sessions: publishedSessions })
  } catch (error) {
    console.error('Error fetching published sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch published sessions' },
      { status: 500 }
    )
  }
}
