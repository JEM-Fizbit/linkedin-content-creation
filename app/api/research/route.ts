import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId, safeJsonParse } from '@/lib/utils'
import {
  isSearchConfigured,
  conductResearch,
  conductDeepResearch,
  buildResearchContext,
  getAvailableProviders
} from '@/lib/search'
import type { SearchResult, ResearchContext, Citation } from '@/types'

// POST /api/research - Conduct research for a project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, query, provider = 'auto', deep = false } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      )
    }

    // Check if search is configured
    if (!isSearchConfigured()) {
      return NextResponse.json(
        { error: 'No search provider configured. Set ANTHROPIC_API_KEY or PERPLEXITY_API_KEY in .env.local' },
        { status: 503 }
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

    // Conduct research
    let searchResult: SearchResult

    if (deep && provider !== 'claude') {
      // Deep research using Perplexity
      searchResult = await conductDeepResearch(query, {
        deepResearch: true,
        recencyFilter: 'month'
      })
    } else {
      // Standard research
      searchResult = await conductResearch(query, {
        enabled: true,
        provider: provider === 'auto' ? 'auto' : provider,
        maxSearches: 5
      })
    }

    // Build research context
    const researchContext = buildResearchContext([searchResult])

    // Save to database
    const researchId = generateId()
    const now = new Date().toISOString()

    const insertStmt = db.prepare(`
      INSERT INTO research_results (id, project_id, query, results, citations, provider, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    insertStmt.run(
      researchId,
      project_id,
      query,
      JSON.stringify(searchResult.results),
      JSON.stringify(searchResult.citations),
      searchResult.provider,
      searchResult.summary || '',
      now
    )

    return NextResponse.json({
      id: researchId,
      project_id,
      searchResult,
      researchContext
    })
  } catch (error) {
    console.error('Research error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed' },
      { status: 500 }
    )
  }
}

// GET /api/research - Get research results for a project
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id query parameter is required' },
        { status: 400 }
      )
    }

    // Get all research results for project
    const stmt = db.prepare(`
      SELECT * FROM research_results
      WHERE project_id = ?
      ORDER BY created_at DESC
    `)
    const rows = stmt.all(projectId) as Array<{
      id: string
      project_id: string
      query: string
      results: string
      citations: string
      provider: string
      summary: string
      created_at: string
    }>

    const research = rows.map(row => ({
      id: row.id,
      project_id: row.project_id,
      query: row.query,
      results: safeJsonParse(row.results, []),
      citations: safeJsonParse(row.citations, []),
      provider: row.provider as 'claude' | 'perplexity',
      summary: row.summary,
      created_at: row.created_at
    }))

    // Build combined research context
    const allSearchResults: SearchResult[] = research.map(r => ({
      id: r.id,
      query: r.query,
      results: r.results,
      citations: r.citations,
      provider: r.provider,
      summary: r.summary,
      created_at: r.created_at
    }))

    const combinedContext = buildResearchContext(allSearchResults)

    return NextResponse.json({
      research,
      researchContext: combinedContext,
      providers: getAvailableProviders()
    })
  } catch (error) {
    console.error('Error fetching research:', error)
    return NextResponse.json(
      { error: 'Failed to fetch research' },
      { status: 500 }
    )
  }
}

// DELETE /api/research - Delete a research result
export async function DELETE(request: NextRequest) {
  try {
    const researchId = request.nextUrl.searchParams.get('id')

    if (!researchId) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      )
    }

    const stmt = db.prepare('DELETE FROM research_results WHERE id = ?')
    const result = stmt.run(researchId)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Research result not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting research:', error)
    return NextResponse.json(
      { error: 'Failed to delete research' },
      { status: 500 }
    )
  }
}
