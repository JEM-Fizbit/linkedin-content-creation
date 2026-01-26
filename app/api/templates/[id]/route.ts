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
 * GET /api/templates/[id]
 * Get a carousel template with its slides
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = db.prepare(`
      SELECT id, project_id, name, slide_count, created_at
      FROM carousel_templates
      WHERE id = ?
    `).get(id) as TemplateRow | undefined

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const slides = db.prepare(`
      SELECT id, template_id, position, background_data, text_zones
      FROM carousel_template_slides
      WHERE template_id = ?
      ORDER BY position
    `).all(id) as SlideRow[]

    return NextResponse.json({
      ...template,
      slides: slides.map(slide => ({
        id: slide.id,
        template_id: slide.template_id,
        position: slide.position,
        background_data: slide.background_data ?
          Buffer.from(slide.background_data).toString('base64') : null,
        text_zones: JSON.parse(slide.text_zones) as TextZone[]
      }))
    })

  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/templates/[id]
 * Update template name or slide text zones
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const template = db.prepare(`
      SELECT id FROM carousel_templates WHERE id = ?
    `).get(id) as { id: string } | undefined

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Update template name if provided
    if (body.name) {
      db.prepare(`
        UPDATE carousel_templates SET name = ? WHERE id = ?
      `).run(body.name, id)
    }

    // Update slide text zones if provided
    if (body.slides && Array.isArray(body.slides)) {
      const updateSlide = db.prepare(`
        UPDATE carousel_template_slides
        SET text_zones = ?
        WHERE id = ?
      `)

      for (const slide of body.slides) {
        if (slide.id && slide.text_zones) {
          updateSlide.run(JSON.stringify(slide.text_zones), slide.id)
        }
      }
    }

    // Return updated template
    const updatedTemplate = db.prepare(`
      SELECT id, project_id, name, slide_count, created_at
      FROM carousel_templates
      WHERE id = ?
    `).get(id) as TemplateRow

    const slides = db.prepare(`
      SELECT id, template_id, position, background_data, text_zones
      FROM carousel_template_slides
      WHERE template_id = ?
      ORDER BY position
    `).all(id) as SlideRow[]

    return NextResponse.json({
      ...updatedTemplate,
      slides: slides.map(slide => ({
        id: slide.id,
        template_id: slide.template_id,
        position: slide.position,
        background_data: slide.background_data ?
          Buffer.from(slide.background_data).toString('base64') : null,
        text_zones: JSON.parse(slide.text_zones) as TextZone[]
      }))
    })

  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a carousel template and its slides
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = db.prepare(`
      SELECT id FROM carousel_templates WHERE id = ?
    `).get(id) as { id: string } | undefined

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Cascade delete will handle slides
    db.prepare(`DELETE FROM carousel_templates WHERE id = ?`).run(id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
