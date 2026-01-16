import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId, safeJsonParse } from '@/lib/utils'
import type { Project, Output } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/projects/:id/duplicate - Create a copy of a project
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get the source project
    const projectStmt = db.prepare('SELECT * FROM projects WHERE id = ?')
    const sourceProject = projectStmt.get(id) as Project | undefined

    if (!sourceProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const newId = generateId()
    const now = new Date().toISOString()

    // Create new project as a remix
    const insertProjectStmt = db.prepare(`
      INSERT INTO projects (id, name, topic, target_audience, content_style, platform, status, current_step, created_at, updated_at, remix_of_project_id)
      VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 'hooks', ?, ?, ?)
    `)

    insertProjectStmt.run(
      newId,
      `Copy of ${sourceProject.name}`,
      sourceProject.topic,
      sourceProject.target_audience,
      sourceProject.content_style,
      sourceProject.platform,
      now,
      now,
      id
    )

    // Copy outputs if they exist
    const outputStmt = db.prepare('SELECT * FROM outputs WHERE project_id = ?')
    const sourceOutput = outputStmt.get(id) as (Output & {
      hooks: string
      hooks_original: string
      ctas: string
      ctas_original: string
      visual_concepts: string
      visual_concepts_original: string
      intros: string
      intros_original: string
      titles: string
      titles_original: string
    }) | undefined

    if (sourceOutput) {
      const outputId = generateId()
      const insertOutputStmt = db.prepare(`
        INSERT INTO outputs (
          id, project_id, hooks, hooks_original, body_content, body_content_original,
          intros, intros_original, titles, titles_original,
          ctas, ctas_original, visual_concepts, visual_concepts_original,
          selected_hook_index, selected_body_index, selected_intro_index, selected_title_index,
          selected_cta_index, selected_visual_index, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      insertOutputStmt.run(
        outputId,
        newId,
        sourceOutput.hooks,
        sourceOutput.hooks_original,
        sourceOutput.body_content,
        sourceOutput.body_content_original,
        sourceOutput.intros,
        sourceOutput.intros_original,
        sourceOutput.titles,
        sourceOutput.titles_original,
        sourceOutput.ctas,
        sourceOutput.ctas_original,
        sourceOutput.visual_concepts,
        sourceOutput.visual_concepts_original,
        sourceOutput.selected_hook_index,
        sourceOutput.selected_body_index,
        sourceOutput.selected_intro_index,
        sourceOutput.selected_title_index,
        sourceOutput.selected_cta_index,
        sourceOutput.selected_visual_index,
        now,
        now
      )
    }

    // Get the new project
    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(newId) as Project

    return NextResponse.json(newProject, { status: 201 })
  } catch (error) {
    console.error('Error duplicating project:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate project' },
      { status: 500 }
    )
  }
}
