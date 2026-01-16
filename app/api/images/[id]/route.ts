import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { GeneratedImage } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/images/:id - Get a specific generated image with its data
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const stmt = db.prepare(`
      SELECT id, project_id, prompt, image_data, width, height, model, is_upscaled, parent_image_id, created_at
      FROM generated_images
      WHERE id = ?
    `)

    const row = stmt.get(id) as {
      id: string
      project_id: string
      prompt: string
      image_data: Buffer | null
      width: number
      height: number
      model: string
      is_upscaled: number
      parent_image_id: string | null
      created_at: string
    } | undefined

    if (!row) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    const image: GeneratedImage = {
      id: row.id,
      project_id: row.project_id,
      prompt: row.prompt,
      image_data: row.image_data ? row.image_data.toString('base64') : undefined,
      width: row.width,
      height: row.height,
      model: row.model,
      is_upscaled: row.is_upscaled === 1,
      parent_image_id: row.parent_image_id || undefined,
      created_at: row.created_at,
    }

    return NextResponse.json(image)
  } catch (error) {
    console.error('Error fetching image:', error)
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    )
  }
}

// DELETE /api/images/:id - Delete a generated image
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verify image exists
    const checkStmt = db.prepare('SELECT id FROM generated_images WHERE id = ?')
    const exists = checkStmt.get(id)

    if (!exists) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    const deleteStmt = db.prepare('DELETE FROM generated_images WHERE id = ?')
    deleteStmt.run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
