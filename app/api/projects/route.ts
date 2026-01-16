import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { Project, ProjectStatus, Platform, CreateProjectRequest } from '@/types'

// GET /api/projects - List all projects with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ProjectStatus | null
    const platform = searchParams.get('platform') as Platform | null
    const search = searchParams.get('search')

    let query = 'SELECT * FROM projects WHERE 1=1'
    const params: string[] = []

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (platform) {
      query += ' AND platform = ?'
      params.push(platform)
    }

    if (search) {
      query += ' AND (name LIKE ? OR topic LIKE ? OR target_audience LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY created_at DESC'

    const stmt = db.prepare(query)
    const projects = stmt.all(...params) as Project[]

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateProjectRequest
    const {
      name,
      topic,
      target_audience = '',
      content_style = '',
      platform = 'linkedin'
    } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'topic is required' },
        { status: 400 }
      )
    }

    // Validate platform
    if (!['linkedin', 'youtube', 'facebook'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be linkedin, youtube, or facebook' },
        { status: 400 }
      )
    }

    const id = generateId()
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO projects (id, name, topic, target_audience, content_style, platform, status, current_step, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 'hooks', ?, ?)
    `)

    stmt.run(id, name, topic, target_audience, content_style, platform, now, now)

    const newProject: Project = {
      id,
      name,
      topic,
      target_audience,
      content_style,
      platform,
      status: 'in_progress',
      current_step: 'hooks',
      created_at: now,
      updated_at: now,
      published_at: null,
      remix_of_project_id: null,
    }

    return NextResponse.json(newProject, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
