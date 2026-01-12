import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Output } from '@/types'

interface DbOutput {
  id: string
  session_id: string
  hooks: string
  hooks_original: string
  body_content: string
  body_content_original: string
  ctas: string
  ctas_original: string
  visual_concepts: string
  visual_concepts_original: string
  created_at: string
  updated_at: string
}

// GET /api/outputs/:sessionId - Get output for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    const stmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
    const dbOutput = stmt.get(sessionId) as DbOutput | undefined

    if (!dbOutput) {
      return NextResponse.json(
        { error: 'Output not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const output: Output = {
      id: dbOutput.id,
      session_id: dbOutput.session_id,
      hooks: JSON.parse(dbOutput.hooks),
      hooks_original: JSON.parse(dbOutput.hooks_original),
      body_content: dbOutput.body_content,
      body_content_original: dbOutput.body_content_original,
      ctas: JSON.parse(dbOutput.ctas),
      ctas_original: JSON.parse(dbOutput.ctas_original),
      visual_concepts: JSON.parse(dbOutput.visual_concepts),
      visual_concepts_original: JSON.parse(dbOutput.visual_concepts_original),
      created_at: dbOutput.created_at,
      updated_at: dbOutput.updated_at,
    }

    return NextResponse.json({ output })
  } catch (error) {
    console.error('Error fetching output:', error)
    return NextResponse.json(
      { error: 'Failed to fetch output' },
      { status: 500 }
    )
  }
}

// PATCH /api/outputs/:sessionId - Update output (for editing)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()

    // Verify output exists
    const stmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
    const existingOutput = stmt.get(sessionId) as DbOutput | undefined

    if (!existingOutput) {
      return NextResponse.json(
        { error: 'Output not found' },
        { status: 404 }
      )
    }

    const updates: string[] = []
    const values: (string | null)[] = []

    if (body.hooks !== undefined) {
      updates.push('hooks = ?')
      values.push(JSON.stringify(body.hooks))
    }
    if (body.body_content !== undefined) {
      updates.push('body_content = ?')
      values.push(body.body_content)
    }
    if (body.ctas !== undefined) {
      updates.push('ctas = ?')
      values.push(JSON.stringify(body.ctas))
    }
    if (body.visual_concepts !== undefined) {
      updates.push('visual_concepts = ?')
      values.push(JSON.stringify(body.visual_concepts))
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(sessionId)

    const updateStmt = db.prepare(`
      UPDATE outputs SET ${updates.join(', ')} WHERE session_id = ?
    `)
    updateStmt.run(...values)

    // Fetch updated output
    const updatedDbOutput = stmt.get(sessionId) as DbOutput

    const output: Output = {
      id: updatedDbOutput.id,
      session_id: updatedDbOutput.session_id,
      hooks: JSON.parse(updatedDbOutput.hooks),
      hooks_original: JSON.parse(updatedDbOutput.hooks_original),
      body_content: updatedDbOutput.body_content,
      body_content_original: updatedDbOutput.body_content_original,
      ctas: JSON.parse(updatedDbOutput.ctas),
      ctas_original: JSON.parse(updatedDbOutput.ctas_original),
      visual_concepts: JSON.parse(updatedDbOutput.visual_concepts),
      visual_concepts_original: JSON.parse(updatedDbOutput.visual_concepts_original),
      created_at: updatedDbOutput.created_at,
      updated_at: updatedDbOutput.updated_at,
    }

    return NextResponse.json({ output })
  } catch (error) {
    console.error('Error updating output:', error)
    return NextResponse.json(
      { error: 'Failed to update output' },
      { status: 500 }
    )
  }
}
