import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { ContentVersion, ContentType } from '@/types'

// GET /api/content-versions - Fetch content versions for a specific item
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const contentType = searchParams.get('content_type') as ContentType
    const contentIndex = searchParams.get('content_index')

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    if (!contentType) {
      return NextResponse.json(
        { error: 'content_type is required' },
        { status: 400 }
      )
    }

    if (contentIndex === null) {
      return NextResponse.json(
        { error: 'content_index is required' },
        { status: 400 }
      )
    }

    const stmt = db.prepare(`
      SELECT * FROM content_versions
      WHERE project_id = ? AND content_type = ? AND content_index = ?
      ORDER BY created_at DESC
    `)
    const versions = stmt.all(projectId, contentType, parseInt(contentIndex)) as ContentVersion[]

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching content versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content versions' },
      { status: 500 }
    )
  }
}

// POST /api/content-versions - Record a content version change
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, content_type, content_index, old_content, new_content, edited_by = 'user' } = body

    if (!project_id || !content_type || content_index === undefined || !old_content || !new_content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const id = crypto.randomUUID()
    const stmt = db.prepare(`
      INSERT INTO content_versions (id, project_id, content_type, content_index, old_content, new_content, edited_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(id, project_id, content_type, content_index, old_content, new_content, edited_by)

    const version = db.prepare('SELECT * FROM content_versions WHERE id = ?').get(id) as ContentVersion

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error('Error creating content version:', error)
    return NextResponse.json(
      { error: 'Failed to create content version' },
      { status: 500 }
    )
  }
}
