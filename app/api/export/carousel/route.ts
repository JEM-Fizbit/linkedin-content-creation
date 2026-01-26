import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import type { CarouselSlide } from '@/types'

interface CarouselOutputRow {
  id: string
  project_id: string
  template_id: string | null
  slides: string
}

interface ProjectRow {
  id: string
  name: string
}

/**
 * POST /api/export/carousel
 * Export carousel as PDF or PNG ZIP
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, carousel_id, format = 'pdf' } = body

    if (!project_id || !carousel_id) {
      return NextResponse.json(
        { error: 'project_id and carousel_id are required' },
        { status: 400 }
      )
    }

    if (format !== 'pdf' && format !== 'png-zip') {
      return NextResponse.json(
        { error: 'format must be "pdf" or "png-zip"' },
        { status: 400 }
      )
    }

    // Get project name for filename
    const project = db.prepare(`
      SELECT id, name FROM projects WHERE id = ?
    `).get(project_id) as ProjectRow | undefined

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get carousel output
    const carouselOutput = db.prepare(`
      SELECT id, project_id, template_id, slides
      FROM carousel_outputs
      WHERE id = ? AND project_id = ?
    `).get(carousel_id, project_id) as CarouselOutputRow | undefined

    if (!carouselOutput) {
      return NextResponse.json({ error: 'Carousel not found' }, { status: 404 })
    }

    const slides: CarouselSlide[] = JSON.parse(carouselOutput.slides)

    // Check if slides have rendered images
    const hasRenderedImages = slides.every(s => s.rendered_image)
    if (!hasRenderedImages) {
      return NextResponse.json(
        { error: 'Carousel slides need to be rendered first. Call /api/carousel/render' },
        { status: 400 }
      )
    }

    // Generate safe filename
    const safeFilename = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    if (format === 'pdf') {
      // Generate PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [1080, 1080]
      })

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]

        if (i > 0) {
          pdf.addPage([1080, 1080])
        }

        // Add image to page
        const imageData = `data:image/png;base64,${slide.rendered_image}`
        pdf.addImage(imageData, 'PNG', 0, 0, 1080, 1080)
      }

      const pdfData = pdf.output('arraybuffer')
      const pdfBase64 = Buffer.from(pdfData).toString('base64')

      return NextResponse.json({
        filename: `${safeFilename}-carousel.pdf`,
        data: pdfBase64,
        mime_type: 'application/pdf'
      })

    } else {
      // Generate PNG ZIP
      const zip = new JSZip()

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        const slideNumber = String(i + 1).padStart(2, '0')
        const filename = `slide-${slideNumber}.png`

        // Decode base64 image and add to ZIP
        const imageBuffer = Buffer.from(slide.rendered_image!, 'base64')
        zip.file(filename, imageBuffer)
      }

      const zipData = await zip.generateAsync({ type: 'nodebuffer' })
      const zipBase64 = zipData.toString('base64')

      return NextResponse.json({
        filename: `${safeFilename}-carousel.zip`,
        data: zipBase64,
        mime_type: 'application/zip'
      })
    }

  } catch (error) {
    console.error('Error exporting carousel:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export carousel' },
      { status: 500 }
    )
  }
}
