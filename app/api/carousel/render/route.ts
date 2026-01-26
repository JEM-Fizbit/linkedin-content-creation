import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import sharp from 'sharp'
import type { TextZone, CarouselSlide } from '@/types'

interface CarouselOutputRow {
  id: string
  project_id: string
  template_id: string | null
  slides: string
}

interface TemplateSlideRow {
  id: string
  position: number
  background_data: Buffer | null
  text_zones: string
}

/**
 * Create an SVG text element for rendering on the slide
 */
function createTextSvg(
  text: string,
  zone: TextZone,
  slideWidth: number,
  slideHeight: number
): string {
  const fontSize = zone.fontSize || 48
  const fontFamily = zone.fontFamily || 'Arial, sans-serif'
  const fontWeight = zone.fontWeight || 'bold'
  const color = zone.color || '#000000'
  const textAlign = zone.textAlign || 'center'
  const lineHeight = zone.lineHeight || 1.2

  // Calculate text anchor based on alignment
  const textAnchor = textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'middle'

  // Calculate x position based on alignment
  let xPos = zone.x
  if (textAlign === 'center') {
    xPos = zone.x + zone.width / 2
  } else if (textAlign === 'right') {
    xPos = zone.x + zone.width
  }

  // Word wrap text
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  // Approximate character width (rough estimate)
  const charWidth = fontSize * 0.6

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = testLine.length * charWidth

    if (testWidth > zone.width && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }

  // Generate tspan elements for each line
  const lineSpacing = fontSize * lineHeight
  const totalHeight = lines.length * lineSpacing
  const startY = zone.y + (zone.height - totalHeight) / 2 + fontSize

  const tspans = lines.map((line, index) => {
    const y = startY + index * lineSpacing
    return `<tspan x="${xPos}" y="${y}">${escapeXml(line)}</tspan>`
  }).join('')

  return `<text
    font-family="${fontFamily}"
    font-size="${fontSize}"
    font-weight="${fontWeight}"
    fill="${color}"
    text-anchor="${textAnchor}"
  >${tspans}</text>`
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Render text onto a slide background
 */
async function renderSlide(
  backgroundData: Buffer | null,
  textZones: TextZone[],
  slideContent: CarouselSlide,
  slideWidth: number = 1080,
  slideHeight: number = 1080
): Promise<Buffer> {
  // Start with background or create blank
  let baseImage: sharp.Sharp

  if (backgroundData) {
    baseImage = sharp(backgroundData).resize(slideWidth, slideHeight, { fit: 'cover' })
  } else {
    // Create solid color background
    const bgColor = slideContent.background_color || '#ffffff'
    baseImage = sharp({
      create: {
        width: slideWidth,
        height: slideHeight,
        channels: 4,
        background: bgColor
      }
    })
  }

  // If no text zones defined, create default zones for headline/body
  let effectiveZones = textZones
  if (!textZones || textZones.length === 0) {
    effectiveZones = [
      {
        id: 'default-headline',
        type: 'headline',
        x: 80,
        y: slideHeight / 2 - 100,
        width: slideWidth - 160,
        height: 150,
        fontSize: 72,
        fontWeight: 'bold',
        color: '#1a1a1a',
        textAlign: 'center'
      },
      {
        id: 'default-body',
        type: 'body',
        x: 80,
        y: slideHeight / 2 + 80,
        width: slideWidth - 160,
        height: 200,
        fontSize: 36,
        fontWeight: 'normal',
        color: '#4a4a4a',
        textAlign: 'center'
      }
    ]
  }

  // Build SVG overlay with text
  const textElements: string[] = []

  for (const zone of effectiveZones) {
    let text = ''

    switch (zone.type) {
      case 'headline':
        text = slideContent.headline || ''
        break
      case 'body':
        text = slideContent.body || ''
        break
      case 'cta':
        text = slideContent.cta || ''
        break
    }

    if (text) {
      textElements.push(createTextSvg(text, zone, slideWidth, slideHeight))
    }
  }

  if (textElements.length > 0) {
    const svgOverlay = Buffer.from(`
      <svg width="${slideWidth}" height="${slideHeight}" xmlns="http://www.w3.org/2000/svg">
        ${textElements.join('\n')}
      </svg>
    `)

    return baseImage
      .composite([{ input: svgOverlay, top: 0, left: 0 }])
      .png()
      .toBuffer()
  }

  return baseImage.png().toBuffer()
}

/**
 * POST /api/carousel/render
 * Render all carousel slides with text overlaid on template backgrounds
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, carousel_id } = body

    if (!project_id || !carousel_id) {
      return NextResponse.json(
        { error: 'project_id and carousel_id are required' },
        { status: 400 }
      )
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

    // Get template slides if template is set
    let templateSlides: TemplateSlideRow[] = []
    if (carouselOutput.template_id) {
      templateSlides = db.prepare(`
        SELECT id, position, background_data, text_zones
        FROM carousel_template_slides
        WHERE template_id = ?
        ORDER BY position
      `).all(carouselOutput.template_id) as TemplateSlideRow[]
    }

    // Render each slide
    const renderedSlides: Array<CarouselSlide & { rendered_image: string }> = []

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]

      // Find matching template slide
      const templateSlide = templateSlides.find(ts => ts.position === i)

      // Determine background: slide's image_id takes precedence, then template background
      let backgroundData: Buffer | null = templateSlide?.background_data || null

      // If slide has an image_id (reference image from project_assets), use that as background
      if (slide.image_id) {
        try {
          const assetRow = db.prepare('SELECT data FROM project_assets WHERE id = ?')
            .get(slide.image_id) as { data: Buffer } | undefined
          if (assetRow?.data) {
            backgroundData = assetRow.data
          }
        } catch (err) {
          console.error(`Failed to load asset ${slide.image_id} for slide ${i}:`, err)
        }
      }

      const textZones: TextZone[] = templateSlide ?
        JSON.parse(templateSlide.text_zones) : []

      // Render the slide
      const renderedImage = await renderSlide(
        backgroundData,
        textZones,
        slide
      )

      renderedSlides.push({
        ...slide,
        rendered_image: renderedImage.toString('base64')
      })
    }

    // Update carousel with rendered images
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE carousel_outputs
      SET slides = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(renderedSlides), now, carousel_id)

    return NextResponse.json({
      id: carousel_id,
      project_id,
      template_id: carouselOutput.template_id,
      slides: renderedSlides,
      updated_at: now
    })

  } catch (error) {
    console.error('Error rendering carousel:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to render carousel' },
      { status: 500 }
    )
  }
}
