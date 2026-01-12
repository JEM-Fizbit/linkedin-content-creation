import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Session } from '@/types'
import { createCanvas, registerFont } from 'canvas'

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

// POST /api/export/png - Export visual concept as PNG
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, concept_index = 0 } = body as {
      session_id: string
      concept_index?: number
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

    // Parse visual concepts
    const visuals = JSON.parse(dbOutput.visual_concepts) as VisualConcept[]

    if (concept_index < 0 || concept_index >= visuals.length) {
      return NextResponse.json(
        { error: 'Invalid concept index' },
        { status: 400 }
      )
    }

    const concept = visuals[concept_index]

    // Generate PNG
    const pngBuffer = generateConceptPNG(concept, concept_index, session.title)

    // Return the PNG content with appropriate headers for download
    return new NextResponse(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${sanitizeFilename(session.title)}-concept-${concept_index + 1}.png"`,
      },
    })
  } catch (error) {
    console.error('Error exporting visual concept as PNG:', error)
    return NextResponse.json(
      { error: 'Failed to export visual concept as PNG' },
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

function generateConceptPNG(
  concept: VisualConcept,
  index: number,
  sessionTitle: string
): Buffer {
  // Create a square canvas for social media (1080x1080 is LinkedIn recommended)
  const width = 1080
  const height = 1080
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // LinkedIn blue color
  const linkedInBlue = '#0A66C2'
  const darkGray = '#1F2937'
  const lightGray = '#F3F4F6'
  const mediumGray = '#6B7280'

  // Draw based on concept index (different visual styles)
  if (index === 0) {
    // Split-screen "Then vs Now" design
    drawSplitScreenDesign(ctx, width, height, concept.description)
  } else if (index === 1) {
    // Carousel preview design
    drawCarouselDesign(ctx, width, height, concept.description)
  } else if (index === 2) {
    // Journey/path design
    drawJourneyDesign(ctx, width, height, concept.description)
  } else {
    // Default design for any other index
    drawDefaultDesign(ctx, width, height, concept.description, index)
  }

  // Add LI-Creator watermark
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '24px Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('LI-Creator', width - 30, height - 30)

  return canvas.toBuffer('image/png')
}

function drawSplitScreenDesign(
  ctx: ReturnType<typeof createCanvas>['prototype']['getContext'],
  width: number,
  height: number,
  description: string
) {
  // Left side (muted - "Then")
  ctx.fillStyle = '#D1D5DB'
  ctx.fillRect(0, 0, width / 2, height)

  // Right side (vibrant - "Now")
  const gradient = ctx.createLinearGradient(width / 2, 0, width, height)
  gradient.addColorStop(0, '#0A66C2')
  gradient.addColorStop(1, '#8B5CF6')
  ctx.fillStyle = gradient
  ctx.fillRect(width / 2, 0, width / 2, height)

  // "THEN" text
  ctx.fillStyle = '#6B7280'
  ctx.font = 'bold 72px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('THEN', width / 4, height / 2 - 50)

  // Icon for "Then" side
  ctx.beginPath()
  ctx.arc(width / 4, height / 2 + 50, 60, 0, Math.PI * 2)
  ctx.fillStyle = '#9CA3AF'
  ctx.fill()

  // Clock icon representation
  ctx.strokeStyle = '#6B7280'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(width / 4, height / 2 + 50, 40, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(width / 4, height / 2 + 50)
  ctx.lineTo(width / 4, height / 2 + 25)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(width / 4, height / 2 + 50)
  ctx.lineTo(width / 4 + 20, height / 2 + 60)
  ctx.stroke()

  // "NOW" text
  ctx.fillStyle = 'white'
  ctx.font = 'bold 72px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('NOW', width * 3 / 4, height / 2 - 50)

  // Icon for "Now" side
  ctx.beginPath()
  ctx.arc(width * 3 / 4, height / 2 + 50, 60, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fill()

  // Lightning bolt icon representation
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.moveTo(width * 3 / 4 - 15, height / 2 + 25)
  ctx.lineTo(width * 3 / 4 + 10, height / 2 + 45)
  ctx.lineTo(width * 3 / 4, height / 2 + 45)
  ctx.lineTo(width * 3 / 4 + 15, height / 2 + 75)
  ctx.lineTo(width * 3 / 4 - 10, height / 2 + 55)
  ctx.lineTo(width * 3 / 4, height / 2 + 55)
  ctx.closePath()
  ctx.fill()

  // Add description at bottom
  drawWrappedText(ctx, description, width / 2, height - 150, width - 100, 28, '#374151')
}

function drawCarouselDesign(
  ctx: ReturnType<typeof createCanvas>['prototype']['getContext'],
  width: number,
  height: number,
  description: string
) {
  // Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, '#F8FAFC')
  bgGradient.addColorStop(1, '#E2E8F0')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // Title
  ctx.fillStyle = '#1F2937'
  ctx.font = 'bold 48px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('CAROUSEL CONCEPT', width / 2, 100)

  // Draw carousel slides
  const slideWidth = 160
  const slideHeight = 200
  const slideGap = 30
  const totalWidth = 5 * slideWidth + 4 * slideGap
  const startX = (width - totalWidth) / 2
  const slideY = (height - slideHeight) / 2

  const colors = ['#0A66C2', '#8B5CF6', '#EC4899', '#F97316', '#10B981']
  const labels = ['Hook', 'Tip 1', 'Tip 2', 'Tip 3', 'CTA']

  for (let i = 0; i < 5; i++) {
    const x = startX + i * (slideWidth + slideGap)

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.beginPath()
    ctx.roundRect(x + 5, slideY + 5, slideWidth, slideHeight, 12)
    ctx.fill()

    // Slide
    ctx.fillStyle = colors[i]
    ctx.beginPath()
    ctx.roundRect(x, slideY, slideWidth, slideHeight, 12)
    ctx.fill()

    // Label
    ctx.fillStyle = 'white'
    ctx.font = 'bold 24px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(labels[i], x + slideWidth / 2, slideY + slideHeight / 2 + 8)
  }

  // Add description at bottom
  drawWrappedText(ctx, description, width / 2, height - 150, width - 100, 26, '#374151')
}

function drawJourneyDesign(
  ctx: ReturnType<typeof createCanvas>['prototype']['getContext'],
  width: number,
  height: number,
  description: string
) {
  // Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, '#ECFDF5')
  bgGradient.addColorStop(1, '#D1FAE5')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // Title
  ctx.fillStyle = '#1F2937'
  ctx.font = 'bold 48px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('THE JOURNEY', width / 2, 120)

  // Draw the path
  const pathY = height / 2
  const circleRadius = 80
  const positions = [width / 6, width / 2, width * 5 / 6]
  const colors = ['#D1D5DB', '#0A66C2', '#10B981']
  const labels = ['Before', 'Shift', 'After']
  const numbers = ['1', '2', '3']

  // Draw connecting lines
  const lineGradient = ctx.createLinearGradient(positions[0], 0, positions[2], 0)
  lineGradient.addColorStop(0, '#D1D5DB')
  lineGradient.addColorStop(0.5, '#0A66C2')
  lineGradient.addColorStop(1, '#10B981')
  ctx.strokeStyle = lineGradient
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(positions[0] + circleRadius, pathY)
  ctx.lineTo(positions[2] - circleRadius, pathY)
  ctx.stroke()

  // Draw circles
  for (let i = 0; i < 3; i++) {
    // Circle
    ctx.beginPath()
    ctx.arc(positions[i], pathY, circleRadius, 0, Math.PI * 2)
    ctx.fillStyle = colors[i]
    ctx.fill()

    // Number
    ctx.fillStyle = i === 0 ? '#6B7280' : 'white'
    ctx.font = 'bold 48px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(numbers[i], positions[i], pathY + 16)

    // Label
    ctx.fillStyle = '#374151'
    ctx.font = '32px Arial, sans-serif'
    ctx.fillText(labels[i], positions[i], pathY + circleRadius + 50)
  }

  // Add description at bottom
  drawWrappedText(ctx, description, width / 2, height - 150, width - 100, 26, '#374151')
}

function drawDefaultDesign(
  ctx: ReturnType<typeof createCanvas>['prototype']['getContext'],
  width: number,
  height: number,
  description: string,
  index: number
) {
  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, '#0A66C2')
  bgGradient.addColorStop(1, '#8B5CF6')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // Add some decorative circles
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.beginPath()
  ctx.arc(width * 0.2, height * 0.3, 200, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(width * 0.8, height * 0.7, 150, 0, Math.PI * 2)
  ctx.fill()

  // Title
  ctx.fillStyle = 'white'
  ctx.font = 'bold 64px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`CONCEPT ${index + 1}`, width / 2, 200)

  // Description in center with white text
  drawWrappedText(ctx, description, width / 2, height / 2, width - 150, 32, 'white')
}

function drawWrappedText(
  ctx: ReturnType<typeof createCanvas>['prototype']['getContext'],
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: string
) {
  ctx.fillStyle = color
  ctx.font = `${fontSize}px Arial, sans-serif`
  ctx.textAlign = 'center'

  const words = text.split(' ')
  let line = ''
  let lineY = y

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' '
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, lineY)
      line = words[i] + ' '
      lineY += fontSize * 1.4
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, lineY)
}
