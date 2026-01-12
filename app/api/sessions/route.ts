import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId, generateTitle } from '@/lib/utils'
import type { Session, SessionStatus } from '@/types'

// GET /api/sessions - List all sessions with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as SessionStatus | null
    const search = searchParams.get('search')

    let query = 'SELECT * FROM sessions WHERE 1=1'
    const params: (string | SessionStatus)[] = []

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (search) {
      query += ' AND (title LIKE ? OR original_idea LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY created_at DESC'

    const stmt = db.prepare(query)
    const sessions = stmt.all(...params) as Session[]

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create new session (optionally as a remix)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { original_idea, remix_of_session_id } = body

    if (!original_idea || typeof original_idea !== 'string') {
      return NextResponse.json(
        { error: 'original_idea is required' },
        { status: 400 }
      )
    }

    // If this is a remix, verify the source session exists
    let sourceSession: Session | undefined
    if (remix_of_session_id) {
      const sourceStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
      sourceSession = sourceStmt.get(remix_of_session_id) as Session | undefined

      if (!sourceSession) {
        return NextResponse.json(
          { error: 'Source session not found' },
          { status: 404 }
        )
      }
    }

    const id = generateId()
    const title = remix_of_session_id
      ? `Remix: ${generateTitle(original_idea)}`
      : generateTitle(original_idea)
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO sessions (id, title, original_idea, status, created_at, updated_at, remix_of_session_id)
      VALUES (?, ?, ?, 'in_progress', ?, ?, ?)
    `)

    stmt.run(id, title, original_idea, now, now, remix_of_session_id || null)

    const newSession: Session = {
      id,
      title,
      original_idea,
      status: 'in_progress',
      created_at: now,
      updated_at: now,
      published_at: null,
      remix_of_session_id: remix_of_session_id || null,
    }

    return NextResponse.json(newSession, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
