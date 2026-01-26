import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Project, Message, Output, UpdateProjectRequest, GeneratedImage, ProjectAsset } from '@/types'
import { safeJsonParse, generateId } from '@/lib/utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/projects/:id - Get project details with messages, output, and generated images
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const projectStmt = db.prepare('SELECT * FROM projects WHERE id = ?')
    const project = projectStmt.get(id) as Project | undefined

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get messages
    const messagesStmt = db.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC')
    const messages = messagesStmt.all(id) as Message[]

    // Get output with JSON parsing
    const outputStmt = db.prepare('SELECT * FROM outputs WHERE project_id = ?')
    const outputRow = outputStmt.get(id) as (Omit<Output, 'hooks' | 'hooks_original' | 'ctas' | 'ctas_original' | 'visual_concepts' | 'visual_concepts_original' | 'intros' | 'intros_original' | 'titles' | 'titles_original'> & {
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

    let output: Output | null = null
    if (outputRow) {
      output = {
        ...outputRow,
        hooks: safeJsonParse(outputRow.hooks, []),
        hooks_original: safeJsonParse(outputRow.hooks_original, []),
        ctas: safeJsonParse(outputRow.ctas, []),
        ctas_original: safeJsonParse(outputRow.ctas_original, []),
        visual_concepts: safeJsonParse(outputRow.visual_concepts, []),
        visual_concepts_original: safeJsonParse(outputRow.visual_concepts_original, []),
        intros: safeJsonParse(outputRow.intros, []),
        intros_original: safeJsonParse(outputRow.intros_original, []),
        titles: safeJsonParse(outputRow.titles, []),
        titles_original: safeJsonParse(outputRow.titles_original, []),
      }
    }

    // Get generated images (including image data for display)
    const imagesStmt = db.prepare(`
      SELECT id, project_id, prompt, image_data, image_url, width, height, model, is_upscaled, parent_image_id, created_at
      FROM generated_images
      WHERE project_id = ?
      ORDER BY created_at DESC
    `)
    const imagesRaw = imagesStmt.all(id) as Array<{
      id: string
      project_id: string
      prompt: string
      image_data: Buffer | null
      image_url: string | null
      width: number
      height: number
      model: string
      is_upscaled: number
      parent_image_id: string | null
      created_at: string
    }>

    // Convert Buffer to base64 string for frontend
    const generatedImages = imagesRaw.map(img => ({
      id: img.id,
      project_id: img.project_id,
      prompt: img.prompt,
      image_data: img.image_data ? img.image_data.toString('base64') : undefined,
      image_url: img.image_url,
      width: img.width,
      height: img.height,
      model: img.model,
      is_upscaled: img.is_upscaled === 1,
      parent_image_id: img.parent_image_id,
      created_at: img.created_at,
    }))

    // Get project assets (without blob data for listing)
    const assetsStmt = db.prepare(`
      SELECT id, project_id, type, filename, mime_type, created_at
      FROM project_assets
      WHERE project_id = ?
      ORDER BY created_at DESC
    `)
    const assets = assetsStmt.all(id) as Omit<ProjectAsset, 'data'>[]

    return NextResponse.json({
      project,
      messages,
      output,
      generatedImages,
      assets,
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/:id - Update project
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json() as UpdateProjectRequest

    // Verify project exists
    const checkStmt = db.prepare('SELECT id FROM projects WHERE id = ?')
    const exists = checkStmt.get(id)

    if (!exists) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const updates: string[] = []
    const values: (string | null)[] = []

    if (body.name !== undefined) {
      updates.push('name = ?')
      values.push(body.name)
    }

    if (body.topic !== undefined) {
      updates.push('topic = ?')
      values.push(body.topic)
    }

    if (body.target_audience !== undefined) {
      updates.push('target_audience = ?')
      values.push(body.target_audience)
    }

    if (body.content_style !== undefined) {
      updates.push('content_style = ?')
      values.push(body.content_style)
    }

    if (body.platform !== undefined) {
      if (!['linkedin', 'youtube', 'facebook'].includes(body.platform)) {
        return NextResponse.json(
          { error: 'Invalid platform' },
          { status: 400 }
        )
      }
      updates.push('platform = ?')
      values.push(body.platform)
    }

    if (body.status !== undefined) {
      if (!['in_progress', 'complete', 'published'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }
      updates.push('status = ?')
      values.push(body.status)

      if (body.status === 'published') {
        updates.push('published_at = ?')
        values.push(new Date().toISOString())
      }
    }

    if (body.current_step !== undefined) {
      const validSteps = ['hooks', 'body', 'intros', 'titles', 'ctas', 'visuals', 'thumbnails', 'carousel', 'complete']
      if (!validSteps.includes(body.current_step)) {
        return NextResponse.json(
          { error: 'Invalid current_step' },
          { status: 400 }
        )
      }
      updates.push('current_step = ?')
      values.push(body.current_step)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const updateStmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`)
    updateStmt.run(...values)

    const getStmt = db.prepare('SELECT * FROM projects WHERE id = ?')
    const updatedProject = getStmt.get(id) as Project

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/:id - Delete project and related data
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verify project exists
    const checkStmt = db.prepare('SELECT id FROM projects WHERE id = ?')
    const exists = checkStmt.get(id)

    if (!exists) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete project (cascade will handle messages, outputs, assets, generated_images, etc.)
    const deleteStmt = db.prepare('DELETE FROM projects WHERE id = ?')
    deleteStmt.run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
