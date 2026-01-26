import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { ProjectSource, CreateSourceRequest } from '@/types'

// POST /api/sources - Create a new text source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateSourceRequest
    const { project_id, type, title, content, original_filename, original_url, mime_type } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    if (!type || !['text', 'file', 'url'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type is required (text, file, or url)' },
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const projectStmt = db.prepare('SELECT id FROM projects WHERE id = ?')
    const project = projectStmt.get(project_id)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const sourceId = generateId()
    const now = new Date().toISOString()

    const insertStmt = db.prepare(`
      INSERT INTO project_sources (id, project_id, type, title, content, original_filename, original_url, mime_type, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `)

    insertStmt.run(
      sourceId,
      project_id,
      type,
      title.trim(),
      content,
      original_filename || null,
      original_url || null,
      mime_type || null,
      now
    )

    const source: ProjectSource = {
      id: sourceId,
      project_id,
      type,
      title: title.trim(),
      content,
      original_filename,
      original_url,
      mime_type,
      enabled: true,
      created_at: now,
    }

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    console.error('Error creating source:', error)
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    )
  }
}

// GET /api/sources - List sources for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    const stmt = db.prepare(`
      SELECT id, project_id, type, title,
             LENGTH(content) as content_length,
             original_filename, original_url, mime_type, enabled, created_at
      FROM project_sources
      WHERE project_id = ?
      ORDER BY created_at ASC
    `)

    const rows = stmt.all(projectId) as (Omit<ProjectSource, 'content'> & { content_length: number })[]

    // Return sources with word count instead of full content (for listing)
    const sources = rows.map(row => ({
      ...row,
      enabled: Boolean(row.enabled),
      word_count: Math.round((row.content_length || 0) / 5), // Rough word count estimate
    }))

    return NextResponse.json(sources)
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}
