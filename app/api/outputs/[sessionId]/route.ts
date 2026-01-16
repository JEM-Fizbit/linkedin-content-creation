import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Output } from '@/types'
import { safeJsonParse } from '@/lib/utils'

interface DbOutput {
  id: string
  session_id?: string
  project_id?: string
  hooks: string
  hooks_original: string
  body_content: string
  body_content_original: string
  intros: string
  intros_original: string
  titles: string
  titles_original: string
  ctas: string
  ctas_original: string
  visual_concepts: string
  visual_concepts_original: string
  selected_hook_index: number
  selected_body_index: number
  selected_intro_index: number
  selected_title_index: number
  selected_cta_index: number
  selected_visual_index: number
  created_at: string
  updated_at: string
}

// Parse a DB output row to an Output object
function parseDbOutput(dbOutput: DbOutput): Output {
  return {
    id: dbOutput.id,
    session_id: dbOutput.session_id,
    project_id: dbOutput.project_id,
    hooks: safeJsonParse(dbOutput.hooks, []),
    hooks_original: safeJsonParse(dbOutput.hooks_original, []),
    selected_hook_index: dbOutput.selected_hook_index || 0,
    body_content: dbOutput.body_content || '',
    body_content_original: dbOutput.body_content_original || '',
    selected_body_index: dbOutput.selected_body_index || 0,
    intros: safeJsonParse(dbOutput.intros, []),
    intros_original: safeJsonParse(dbOutput.intros_original, []),
    selected_intro_index: dbOutput.selected_intro_index || 0,
    titles: safeJsonParse(dbOutput.titles, []),
    titles_original: safeJsonParse(dbOutput.titles_original, []),
    selected_title_index: dbOutput.selected_title_index || 0,
    ctas: safeJsonParse(dbOutput.ctas, []),
    ctas_original: safeJsonParse(dbOutput.ctas_original, []),
    selected_cta_index: dbOutput.selected_cta_index || 0,
    visual_concepts: safeJsonParse(dbOutput.visual_concepts, []),
    visual_concepts_original: safeJsonParse(dbOutput.visual_concepts_original, []),
    selected_visual_index: dbOutput.selected_visual_index || 0,
    created_at: dbOutput.created_at,
    updated_at: dbOutput.updated_at,
  }
}

// GET /api/outputs/:sessionId - Get output for a session or project
// Note: sessionId parameter can be either a session ID or project ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Try to find by session_id first, then by project_id
    let dbOutput: DbOutput | undefined

    const sessionStmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
    dbOutput = sessionStmt.get(sessionId) as DbOutput | undefined

    if (!dbOutput) {
      const projectStmt = db.prepare('SELECT * FROM outputs WHERE project_id = ?')
      dbOutput = projectStmt.get(sessionId) as DbOutput | undefined
    }

    if (!dbOutput) {
      return NextResponse.json(
        { error: 'Output not found' },
        { status: 404 }
      )
    }

    const output = parseDbOutput(dbOutput)
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

    // Try to find by session_id first, then by project_id
    let existingOutput: DbOutput | undefined
    let idColumn = 'session_id'

    const sessionStmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
    existingOutput = sessionStmt.get(sessionId) as DbOutput | undefined

    if (!existingOutput) {
      const projectStmt = db.prepare('SELECT * FROM outputs WHERE project_id = ?')
      existingOutput = projectStmt.get(sessionId) as DbOutput | undefined
      if (existingOutput) {
        idColumn = 'project_id'
      }
    }

    if (!existingOutput) {
      return NextResponse.json(
        { error: 'Output not found' },
        { status: 404 }
      )
    }

    const updates: string[] = []
    const values: (string | number | null)[] = []

    // Content arrays
    if (body.hooks !== undefined) {
      updates.push('hooks = ?')
      values.push(JSON.stringify(body.hooks))
    }
    if (body.body_content !== undefined) {
      updates.push('body_content = ?')
      values.push(body.body_content)
    }
    if (body.intros !== undefined) {
      updates.push('intros = ?')
      values.push(JSON.stringify(body.intros))
    }
    if (body.titles !== undefined) {
      updates.push('titles = ?')
      values.push(JSON.stringify(body.titles))
    }
    if (body.ctas !== undefined) {
      updates.push('ctas = ?')
      values.push(JSON.stringify(body.ctas))
    }
    if (body.visual_concepts !== undefined) {
      updates.push('visual_concepts = ?')
      values.push(JSON.stringify(body.visual_concepts))
    }

    // Selection indexes
    if (body.selected_hook_index !== undefined) {
      updates.push('selected_hook_index = ?')
      values.push(body.selected_hook_index)
    }
    if (body.selected_body_index !== undefined) {
      updates.push('selected_body_index = ?')
      values.push(body.selected_body_index)
    }
    if (body.selected_intro_index !== undefined) {
      updates.push('selected_intro_index = ?')
      values.push(body.selected_intro_index)
    }
    if (body.selected_title_index !== undefined) {
      updates.push('selected_title_index = ?')
      values.push(body.selected_title_index)
    }
    if (body.selected_cta_index !== undefined) {
      updates.push('selected_cta_index = ?')
      values.push(body.selected_cta_index)
    }
    if (body.selected_visual_index !== undefined) {
      updates.push('selected_visual_index = ?')
      values.push(body.selected_visual_index)
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
      UPDATE outputs SET ${updates.join(', ')} WHERE ${idColumn} = ?
    `)
    updateStmt.run(...values)

    // Fetch updated output
    const getStmt = db.prepare(`SELECT * FROM outputs WHERE ${idColumn} = ?`)
    const updatedDbOutput = getStmt.get(sessionId) as DbOutput

    const output = parseDbOutput(updatedDbOutput)
    return NextResponse.json({ output })
  } catch (error) {
    console.error('Error updating output:', error)
    return NextResponse.json(
      { error: 'Failed to update output' },
      { status: 500 }
    )
  }
}
