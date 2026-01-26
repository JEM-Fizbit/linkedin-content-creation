import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'

interface SearchSettings {
  web_search_enabled: boolean
  search_provider: 'claude' | 'perplexity' | 'auto'
  max_searches: number
}

// GET /api/projects/[id]/search-settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  try {
    const stmt = db.prepare('SELECT * FROM project_search_settings WHERE project_id = ?')
    const settings = stmt.get(projectId) as {
      web_search_enabled: number
      search_provider: string
      max_searches: number
    } | undefined

    if (settings) {
      return NextResponse.json({
        web_search_enabled: settings.web_search_enabled === 1,
        search_provider: settings.search_provider,
        max_searches: settings.max_searches,
      })
    }

    // Return defaults if no settings exist
    return NextResponse.json({
      web_search_enabled: false,
      search_provider: 'claude',
      max_searches: 5,
    })
  } catch (error) {
    console.error('Error fetching search settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch search settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id]/search-settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  try {
    const body = await request.json() as Partial<SearchSettings>

    // Check if settings exist
    const existing = db.prepare('SELECT id FROM project_search_settings WHERE project_id = ?').get(projectId)

    if (existing) {
      // Build update query dynamically based on provided fields
      const updates: string[] = []
      const values: (string | number)[] = []

      if (body.web_search_enabled !== undefined) {
        updates.push('web_search_enabled = ?')
        values.push(body.web_search_enabled ? 1 : 0)
      }
      if (body.search_provider !== undefined) {
        updates.push('search_provider = ?')
        values.push(body.search_provider)
      }
      if (body.max_searches !== undefined) {
        updates.push('max_searches = ?')
        values.push(body.max_searches)
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?')
        values.push(new Date().toISOString())
        values.push(projectId)

        db.prepare(`
          UPDATE project_search_settings
          SET ${updates.join(', ')}
          WHERE project_id = ?
        `).run(...values)
      }
    } else {
      // Create new settings
      db.prepare(`
        INSERT INTO project_search_settings (id, project_id, web_search_enabled, search_provider, max_searches)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        generateId(),
        projectId,
        body.web_search_enabled ? 1 : 0,
        body.search_provider || 'claude',
        body.max_searches || 5
      )
    }

    // Return updated settings
    const settings = db.prepare('SELECT * FROM project_search_settings WHERE project_id = ?').get(projectId) as {
      web_search_enabled: number
      search_provider: string
      max_searches: number
    }

    return NextResponse.json({
      web_search_enabled: settings.web_search_enabled === 1,
      search_provider: settings.search_provider,
      max_searches: settings.max_searches,
    })
  } catch (error) {
    console.error('Error updating search settings:', error)
    return NextResponse.json(
      { error: 'Failed to update search settings' },
      { status: 500 }
    )
  }
}
