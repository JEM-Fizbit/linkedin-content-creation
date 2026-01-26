import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import db from '@/lib/db'
import JSZip from 'jszip'
import sharp from 'sharp'

interface ImportedSlide {
  position: number
  imageData: Buffer
}

/**
 * Create placeholder slides for PDF files
 * Note: Full PDF extraction requires a browser environment.
 * For server-side, we create placeholder slides that can be replaced.
 */
async function createPdfPlaceholders(pdfData: Buffer, estimatedPages: number = 5): Promise<ImportedSlide[]> {
  const slides: ImportedSlide[] = []

  // Create placeholder slides - in production, consider using pdf2pic or similar
  for (let i = 0; i < estimatedPages; i++) {
    const slideImage = await sharp({
      create: {
        width: 1080,
        height: 1080,
        channels: 4,
        background: { r: 245, g: 245, b: 245, alpha: 1 }
      }
    })
      .png()
      .toBuffer()

    slides.push({
      position: i,
      imageData: slideImage
    })
  }

  return slides
}

/**
 * Extract images from a ZIP file
 */
async function extractZipImages(zipData: Buffer): Promise<ImportedSlide[]> {
  const slides: ImportedSlide[] = []

  try {
    const zip = await JSZip.loadAsync(zipData)
    const imageFiles: { name: string; file: JSZip.JSZipObject }[] = []

    // Collect all image files
    zip.forEach((relativePath, file) => {
      if (!file.dir) {
        const ext = relativePath.toLowerCase().split('.').pop()
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
          imageFiles.push({ name: relativePath, file })
        }
      }
    })

    // Sort by filename to maintain order
    imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    // Extract each image
    for (let i = 0; i < imageFiles.length; i++) {
      const { file } = imageFiles[i]
      const imageBuffer = await file.async('nodebuffer')

      // Resize to 1080x1080 for consistency
      const resizedImage = await sharp(imageBuffer)
        .resize(1080, 1080, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toBuffer()

      slides.push({
        position: i,
        imageData: resizedImage
      })
    }
  } catch (error) {
    console.error('Error extracting ZIP images:', error)
    throw new Error('Failed to extract images from ZIP')
  }

  return slides
}

/**
 * Process individual image file
 */
async function processImage(imageData: Buffer): Promise<Buffer> {
  try {
    // Resize to 1080x1080 for consistency
    const resizedImage = await sharp(imageData)
      .resize(1080, 1080, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer()

    return resizedImage
  } catch (error) {
    console.error('Error processing image:', error)
    throw new Error('Failed to process image')
  }
}

/**
 * POST /api/templates/import
 * Import carousel template from PDF, ZIP, or individual image files
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, name, files } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'files are required' }, { status: 400 })
    }

    // Verify project exists
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const slides: ImportedSlide[] = []

    // Process files based on type
    for (const file of files) {
      const { filename, data, mime_type } = file
      const fileBuffer = Buffer.from(data, 'base64')

      if (mime_type === 'application/pdf') {
        // PDF handling: create placeholder slides
        // Note: For best results, export carousel slides as individual PNG files from your design tool
        const pdfSlides = await createPdfPlaceholders(fileBuffer)
        slides.push(...pdfSlides.map((s, idx) => ({
          ...s,
          position: slides.length + idx
        })))
      } else if (mime_type === 'application/zip' || filename.toLowerCase().endsWith('.zip')) {
        // Extract images from ZIP
        const zipSlides = await extractZipImages(fileBuffer)
        slides.push(...zipSlides.map((s, idx) => ({
          ...s,
          position: slides.length + idx
        })))
      } else if (mime_type.startsWith('image/')) {
        // Process individual image
        const processedImage = await processImage(fileBuffer)
        slides.push({
          position: slides.length,
          imageData: processedImage
        })
      } else {
        // Skip unsupported file types
        console.warn(`Skipping unsupported file type: ${mime_type}`)
      }
    }

    if (slides.length === 0) {
      return NextResponse.json({ error: 'No valid slides found in uploaded files' }, { status: 400 })
    }

    // Create template record
    const templateId = uuidv4()

    db.prepare(`
      INSERT INTO carousel_templates (id, project_id, name, slide_count)
      VALUES (?, ?, ?, ?)
    `).run(templateId, project_id, name, slides.length)

    // Create slide records
    const insertSlide = db.prepare(`
      INSERT INTO carousel_template_slides (id, template_id, position, background_data, text_zones)
      VALUES (?, ?, ?, ?, ?)
    `)

    const templateSlides = []
    for (const slide of slides) {
      const slideId = uuidv4()
      insertSlide.run(slideId, templateId, slide.position, slide.imageData, '[]')

      templateSlides.push({
        id: slideId,
        template_id: templateId,
        position: slide.position,
        background_data: slide.imageData.toString('base64'),
        text_zones: []
      })
    }

    return NextResponse.json({
      id: templateId,
      project_id,
      name,
      slide_count: slides.length,
      slides: templateSlides,
      created_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error importing template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import template' },
      { status: 500 }
    )
  }
}
