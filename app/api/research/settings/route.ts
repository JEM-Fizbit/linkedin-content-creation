import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import { getAvailableProviders } from '@/lib/search'
import type { ProjectSearchSettings } from '@/types'

// GET /api/research/settings - Get search settings for a project
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id query parameter is required' },
        { status: 400 }
      )
    }

    const stmt = db.prepare('SELECT * FROM project_search_settings WHERE project_id = ?')
    const row = stmt.get(projectId) as {
      id: string
      project_id: string
      web_search_enabled: number
      search_provider: string
      max_searches: number
      allowed_domains: string | null
    } | undefined

    if (row) {
      const settings: ProjectSearchSettings = {
        webSearchEnabled: row.web_search_enabled === 1,
        searchProvider: row.search_provider as 'claude' | 'perplexity' | 'auto',
        maxSearches: row.max_searches,
        allowedDomains: row.allowed_domains ? JSON.parse(row.allowed_domains) : undefined
      }

      return NextResponse.json({
        settings,
        availableProviders: getAvailableProviders()
      })
    }

    // Return defaults if no settings exist
    return NextResponse.json({
      settings: {
        webSearchEnabled: true,
        searchProvider: 'claude',
        maxSearches: 5
      } as ProjectSearchSettings,
      availableProviders: getAvailableProviders()
    })
  } catch (error) {
    console.error('Error fetching search settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch search settings' },
      { status: 500 }
    )
  }
}

// PUT /api/research/settings - Update search settings for a project
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      project_id,
      webSearchEnabled,
      searchProvider,
      maxSearches,
      allowedDomains
    } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
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

    const now = new Date().toISOString()

    // Check if settings already exist
    const existingStmt = db.prepare('SELECT id FROM project_search_settings WHERE project_id = ?')
    const existing = existingStmt.get(project_id)

    if (existing) {
      // Update existing settings
      const updateStmt = db.prepare(`
        UPDATE project_search_settings
        SET web_search_enabled = ?,
            search_provider = ?,
            max_searches = ?,
            allowed_domains = ?,
            updated_at = ?
        WHERE project_id = ?
      `)
      updateStmt.run(
        webSearchEnabled !== undefined ? (webSearchEnabled ? 1 : 0) : 1,
        searchProvider || 'claude',
        maxSearches || 5,
        allowedDomains ? JSON.stringify(allowedDomains) : null,
        now,
        project_id
      )
    } else {
      // Insert new settings
      const insertStmt = db.prepare(`
        INSERT INTO project_search_settings (id, project_id, web_search_enabled, search_provider, max_searches, allowed_domains, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      insertStmt.run(
        generateId(),
        project_id,
        webSearchEnabled !== undefined ? (webSearchEnabled ? 1 : 0) : 1,
        searchProvider || 'claude',
        maxSearches || 5,
        allowedDomains ? JSON.stringify(allowedDomains) : null,
        now,
        now
      )
    }

    const settings: ProjectSearchSettings = {
      webSearchEnabled: webSearchEnabled !== undefined ? webSearchEnabled : true,
      searchProvider: searchProvider || 'claude',
      maxSearches: maxSearches || 5,
      allowedDomains
    }

    return NextResponse.json({
      settings,
      availableProviders: getAvailableProviders()
    })
  } catch (error) {
    console.error('Error updating search settings:', error)
    return NextResponse.json(
      { error: 'Failed to update search settings' },
      { status: 500 }
    )
  }
}
