import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { TextZone } from '@/types'

interface TemplateRow {
  id: string
  project_id: string
  name: string
  slide_count: number
  created_at: string
}

interface SlideRow {
  id: string
  template_id: string
  position: number
  background_data: Buffer | null
  text_zones: string
}

/**
 * GET /api/templates?project_id=...
 * List all carousel templates for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const templates = db.prepare(`
      SELECT id, project_id, name, slide_count, created_at
      FROM carousel_templates
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(project_id) as TemplateRow[]

    // For each template, get slide count (already have it, but could verify)
    return NextResponse.json(templates)

  } catch (error) {
    console.error('Error listing templates:', error)
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    )
  }
}
