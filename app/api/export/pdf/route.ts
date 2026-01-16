import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Session } from '@/types'
import { jsPDF } from 'jspdf'

interface DbOutput {
  id: string
  session_id: string
  hooks: string
  hooks_original: string
  body_content: string
  body_content_original: string
  ctas: string
  ctas_original: string
  visual_concepts: string
  visual_concepts_original: string
  created_at: string
  updated_at: string
}

interface VisualConcept {
  description: string
  preview_data?: string
}

// POST /api/export/pdf - Export session content as PDF carousel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      session_id,
      selected_hook_index = 0,
      selected_cta_index = 0
    } = body as {
      session_id: string
      selected_hook_index?: number
      selected_cta_index?: number
    }

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    // Verify session exists
    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
    const session = sessionStmt.get(session_id) as Session | undefined

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get output
    const outputStmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
    const dbOutput = outputStmt.get(session_id) as DbOutput | undefined

    if (!dbOutput) {
      return NextResponse.json(
        { error: 'No content to export. Please generate content first.' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const hooks = JSON.parse(dbOutput.hooks) as string[]
    const ctas = JSON.parse(dbOutput.ctas) as string[]
    const visuals = JSON.parse(dbOutput.visual_concepts) as VisualConcept[]

    // Generate PDF
    const pdfBuffer = generateCarouselPDF(
      session,
      hooks,
      dbOutput.body_content,
      ctas,
      visuals,
      selected_hook_index,
      selected_cta_index
    )

    // Return the PDF content with appropriate headers for download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizeFilename(session.title)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error exporting session as PDF:', error)
    return NextResponse.json(
      { error: 'Failed to export session as PDF' },
      { status: 500 }
    )
  }
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .toLowerCase()
}

function generateCarouselPDF(
  session: Session,
  hooks: string[],
  bodyContent: string,
  ctas: string[],
  visuals: VisualConcept[],
  selectedHookIndex: number,
  selectedCtaIndex: number
): Buffer {
  // Create PDF with LinkedIn carousel dimensions (1080x1080 is standard, but we'll use A4 square for simplicity)
  // Using 'p' for portrait and custom size for carousel-like feel
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [200, 200] // Square format for carousel slides
  })

  const pageWidth = 200
  const pageHeight = 200
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)

  // LinkedIn blue color
  const linkedInBlue = '#0A66C2'

  // Helper function to wrap text
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    doc.setFontSize(fontSize)
    return doc.splitTextToSize(text, maxWidth)
  }

  // Helper function to add centered text
  const addCenteredText = (text: string, y: number, fontSize: number, color: string = '#111827') => {
    doc.setFontSize(fontSize)
    doc.setTextColor(color)
    const lines = wrapText(text, contentWidth, fontSize)
    const lineHeight = fontSize * 0.5
    let currentY = y
    lines.forEach((line: string) => {
      const textWidth = doc.getTextWidth(line)
      const x = (pageWidth - textWidth) / 2
      doc.text(line, x, currentY)
      currentY += lineHeight
    })
    return currentY
  }

  // Helper function to add a slide header
  const addSlideHeader = (slideNumber: number, totalSlides: number) => {
    doc.setFontSize(10)
    doc.setTextColor('#6B7280')
    doc.text(`Slide ${slideNumber} of ${totalSlides}`, margin, margin - 5)

    // Add LinkedIn branding
    doc.setTextColor(linkedInBlue)
    doc.text('LI-Creator', pageWidth - margin - 25, margin - 5)
  }

  // Split body content into slide-sized chunks
  const bodyLines = wrapText(bodyContent, contentWidth, 14)
  const linesPerSlide = 12
  const bodySlides: string[][] = []
  for (let i = 0; i < bodyLines.length; i += linesPerSlide) {
    bodySlides.push(bodyLines.slice(i, i + linesPerSlide))
  }

  // Calculate total slides: 1 hook + body slides + 1 CTA + visual concepts
  const totalSlides = 1 + bodySlides.length + 1 + (visuals.length > 0 ? 1 : 0)
  let currentSlide = 1

  // ===== SLIDE 1: HOOK =====
  addSlideHeader(currentSlide, totalSlides)

  // Background color bar at top
  doc.setFillColor(linkedInBlue)
  doc.rect(0, margin + 5, pageWidth, 3, 'F')

  // Hook label
  doc.setFontSize(12)
  doc.setTextColor(linkedInBlue)
  doc.text('HOOK', margin, margin + 20)

  // Selected hook text
  const selectedHook = hooks[selectedHookIndex] || hooks[0] || ''
  doc.setFontSize(22)
  doc.setTextColor('#111827')
  const hookLines = wrapText(selectedHook, contentWidth, 22)
  let yPos = margin + 45
  hookLines.forEach((line: string) => {
    doc.text(line, margin, yPos)
    yPos += 12
  })

  // Footer
  doc.setFontSize(10)
  doc.setTextColor('#9CA3AF')
  doc.text('Swipe for more...', pageWidth / 2 - 15, pageHeight - margin)

  // ===== BODY SLIDES =====
  bodySlides.forEach((slideLines, index) => {
    doc.addPage([200, 200])
    currentSlide++
    addSlideHeader(currentSlide, totalSlides)

    // Body label
    doc.setFontSize(12)
    doc.setTextColor(linkedInBlue)
    doc.text(`BODY${bodySlides.length > 1 ? ` (${index + 1}/${bodySlides.length})` : ''}`, margin, margin + 20)

    // Body content
    doc.setFontSize(14)
    doc.setTextColor('#111827')
    yPos = margin + 40
    slideLines.forEach((line: string) => {
      doc.text(line, margin, yPos)
      yPos += 8
    })

    // Footer
    doc.setFontSize(10)
    doc.setTextColor('#9CA3AF')
    doc.text('Swipe for more...', pageWidth / 2 - 15, pageHeight - margin)
  })

  // ===== CTA SLIDE =====
  doc.addPage([200, 200])
  currentSlide++
  addSlideHeader(currentSlide, totalSlides)

  // Background color bar at bottom
  doc.setFillColor(linkedInBlue)
  doc.rect(0, pageHeight - margin - 5, pageWidth, 3, 'F')

  // CTA label
  doc.setFontSize(12)
  doc.setTextColor(linkedInBlue)
  doc.text('CALL TO ACTION', margin, margin + 20)

  // Selected CTA text
  const selectedCta = ctas[selectedCtaIndex] || ctas[0] || ''
  doc.setFontSize(20)
  doc.setTextColor('#111827')
  const ctaLines = wrapText(selectedCta, contentWidth, 20)
  yPos = margin + 50
  ctaLines.forEach((line: string) => {
    doc.text(line, margin, yPos)
    yPos += 10
  })

  // Action prompt
  doc.setFontSize(14)
  doc.setTextColor(linkedInBlue)
  doc.text('Like, Comment & Share!', pageWidth / 2 - 25, pageHeight - margin - 15)

  // ===== VISUAL CONCEPTS SLIDE (if any) =====
  if (visuals.length > 0) {
    doc.addPage([200, 200])
    currentSlide++
    addSlideHeader(currentSlide, totalSlides)

    // Visual concepts label
    doc.setFontSize(12)
    doc.setTextColor(linkedInBlue)
    doc.text('VISUAL CONCEPTS', margin, margin + 20)

    // List visual concept descriptions
    doc.setFontSize(12)
    doc.setTextColor('#111827')
    yPos = margin + 40
    visuals.forEach((visual, index) => {
      doc.setTextColor(linkedInBlue)
      doc.text(`Concept ${index + 1}:`, margin, yPos)
      yPos += 7

      doc.setTextColor('#374151')
      const conceptLines = wrapText(visual.description, contentWidth, 11)
      conceptLines.slice(0, 4).forEach((line: string) => { // Limit to 4 lines per concept
        doc.text(line, margin, yPos)
        yPos += 6
      })
      yPos += 5
    })
  }

  // Convert to buffer
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}
