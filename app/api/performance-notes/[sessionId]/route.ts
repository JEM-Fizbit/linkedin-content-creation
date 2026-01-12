import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'

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

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

// GET /api/performance-notes/:sessionId - Get performance notes for a session
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params

    const stmt = db.prepare('SELECT * FROM performance_notes WHERE session_id = ?')
    const note = stmt.get(sessionId) as PerformanceNote | undefined

    if (!note) {
      return NextResponse.json({ note: null })
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error fetching performance notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance notes' },
      { status: 500 }
    )
  }
}

// POST /api/performance-notes/:sessionId - Create or update performance notes
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    const { views, likes, comments, reposts, notes } = body

    // Verify session exists and is published
    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
    const session = sessionStmt.get(sessionId) as { id: string; status: string } | undefined

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.status !== 'published') {
      return NextResponse.json(
        { error: 'Performance notes can only be added to published sessions' },
        { status: 400 }
      )
    }

    // Check if performance notes already exist
    const existingStmt = db.prepare('SELECT id FROM performance_notes WHERE session_id = ?')
    const existing = existingStmt.get(sessionId) as { id: string } | undefined

    if (existing) {
      // Update existing notes
      const updateStmt = db.prepare(`
        UPDATE performance_notes
        SET views = ?, likes = ?, comments = ?, reposts = ?, notes = ?, recorded_at = ?
        WHERE session_id = ?
      `)
      updateStmt.run(
        views ?? null,
        likes ?? null,
        comments ?? null,
        reposts ?? null,
        notes ?? '',
        new Date().toISOString(),
        sessionId
      )
    } else {
      // Create new notes
      const insertStmt = db.prepare(`
        INSERT INTO performance_notes (id, session_id, views, likes, comments, reposts, notes, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      insertStmt.run(
        generateId(),
        sessionId,
        views ?? null,
        likes ?? null,
        comments ?? null,
        reposts ?? null,
        notes ?? '',
        new Date().toISOString()
      )
    }

    // Fetch updated notes
    const noteStmt = db.prepare('SELECT * FROM performance_notes WHERE session_id = ?')
    const note = noteStmt.get(sessionId) as PerformanceNote

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error saving performance notes:', error)
    return NextResponse.json(
      { error: 'Failed to save performance notes' },
      { status: 500 }
    )
  }
}
