import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { ProjectSource } from '@/types'

interface SourceRow {
  id: string
  project_id: string
  type: 'text' | 'file' | 'url'
  title: string
  content: string
  original_filename?: string
  original_url?: string
  mime_type?: string
  enabled: number
  created_at: string
}

// GET /api/sources/[id] - Get a single source with full content
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stmt = db.prepare('SELECT * FROM project_sources WHERE id = ?')
    const row = stmt.get(params.id) as SourceRow | undefined

    if (!row) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    const source: ProjectSource = {
      id: row.id,
      project_id: row.project_id,
      type: row.type,
      title: row.title,
      content: row.content,
      original_filename: row.original_filename,
      original_url: row.original_url,
      mime_type: row.mime_type,
      enabled: Boolean(row.enabled),
      created_at: row.created_at,
    }

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error fetching source:', error)
    return NextResponse.json(
      { error: 'Failed to fetch source' },
      { status: 500 }
    )
  }
}

// PATCH /api/sources/[id] - Update a source
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, content, enabled } = body as {
      title?: string
      content?: string
      enabled?: boolean
    }

    // Verify source exists
    const checkStmt = db.prepare('SELECT id FROM project_sources WHERE id = ?')
    const exists = checkStmt.get(params.id)

    if (!exists) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    // Build dynamic update
    const updates: string[] = []
    const values: (string | number)[] = []

    if (title !== undefined) {
      updates.push('title = ?')
      values.push(title.trim())
    }
    if (content !== undefined) {
      updates.push('content = ?')
      values.push(content)
    }
    if (enabled !== undefined) {
      updates.push('enabled = ?')
      values.push(enabled ? 1 : 0)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(params.id)
    const updateStmt = db.prepare(`UPDATE project_sources SET ${updates.join(', ')} WHERE id = ?`)
    updateStmt.run(...values)

    // Return updated source
    const getStmt = db.prepare('SELECT * FROM project_sources WHERE id = ?')
    const updatedRow = getStmt.get(params.id) as SourceRow

    const source: ProjectSource = {
      id: updatedRow.id,
      project_id: updatedRow.project_id,
      type: updatedRow.type,
      title: updatedRow.title,
      content: updatedRow.content,
      original_filename: updatedRow.original_filename,
      original_url: updatedRow.original_url,
      mime_type: updatedRow.mime_type,
      enabled: Boolean(updatedRow.enabled),
      created_at: updatedRow.created_at,
    }

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error updating source:', error)
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    )
  }
}

// DELETE /api/sources/[id] - Delete a source
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const checkStmt = db.prepare('SELECT id FROM project_sources WHERE id = ?')
    const exists = checkStmt.get(params.id)

    if (!exists) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    const deleteStmt = db.prepare('DELETE FROM project_sources WHERE id = ?')
    deleteStmt.run(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting source:', error)
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    )
  }
}
