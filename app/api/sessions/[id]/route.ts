import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Session, Message, Output } from '@/types'
import { safeJsonParse } from '@/lib/utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sessions/:id - Get session details with messages and output
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
    const session = sessionStmt.get(id) as Session | undefined

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const messagesStmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    const messages = messagesStmt.all(id) as Message[]

    const outputStmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
    const outputRow = outputStmt.get(id) as (Omit<Output, 'hooks' | 'hooks_original' | 'ctas' | 'ctas_original' | 'visual_concepts' | 'visual_concepts_original'> & {
      hooks: string
      hooks_original: string
      ctas: string
      ctas_original: string
      visual_concepts: string
      visual_concepts_original: string
    }) | undefined

    let output: Output | null = null
    if (outputRow) {
      output = {
        ...outputRow,
        hooks: safeJsonParse(outputRow.hooks, []),
        hooks_original: safeJsonParse(outputRow.hooks_original, []),
        ctas: safeJsonParse(outputRow.ctas, []),
        ctas_original: safeJsonParse(outputRow.ctas_original, []),
        visual_concepts: safeJsonParse(outputRow.visual_concepts, []),
        visual_concepts_original: safeJsonParse(outputRow.visual_concepts_original, []),
      }
    }

    return NextResponse.json({
      session,
      messages,
      output,
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

// PATCH /api/sessions/:id - Update session
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, status } = body

    // Verify session exists
    const checkStmt = db.prepare('SELECT id FROM sessions WHERE id = ?')
    const exists = checkStmt.get(id)

    if (!exists) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const updates: string[] = []
    const values: (string | null)[] = []

    if (title !== undefined) {
      updates.push('title = ?')
      values.push(title)
    }

    if (status !== undefined) {
      if (!['in_progress', 'complete', 'published'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }
      updates.push('status = ?')
      values.push(status)

      if (status === 'published') {
        updates.push('published_at = ?')
        values.push(new Date().toISOString())
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const updateStmt = db.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`)
    updateStmt.run(...values)

    const getStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
    const updatedSession = getStmt.get(id) as Session

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/:id - Delete session and related data
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verify session exists
    const checkStmt = db.prepare('SELECT id FROM sessions WHERE id = ?')
    const exists = checkStmt.get(id)

    if (!exists) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Delete session (cascade will handle messages, outputs, performance_notes)
    const deleteStmt = db.prepare('DELETE FROM sessions WHERE id = ?')
    deleteStmt.run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}
