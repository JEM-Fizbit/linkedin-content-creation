import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import { generateImage, isConfigured } from '@/lib/gemini'
import type { GeneratedImage, GenerateImageRequest } from '@/types'

// POST /api/images/generate - Generate a new image using Nano Banana
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateImageRequest
    const { project_id, prompt, width = 1024, height = 1024, visual_concept_index } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      )
    }

    // Check if Gemini is configured
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'Google API is not configured. Please set GOOGLE_API_KEY in .env.local' },
        { status: 503 }
      )
    }

    // Verify project exists
    const projectStmt = db.prepare('SELECT id FROM projects WHERE id = ?')
    const project = projectStmt.get(project_id)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Determine aspect ratio based on dimensions
    let aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '1:1'
    if (width > height * 1.5) {
      aspectRatio = '16:9'
    } else if (height > width * 1.5) {
      aspectRatio = '9:16'
    } else if (width > height) {
      aspectRatio = '4:3'
    } else if (height > width) {
      aspectRatio = '3:4'
    }

    // Fetch reference images from project assets for multimodal generation
    let referenceImages: { base64Data: string; mimeType: string }[] | undefined
    try {
      const assetsStmt = db.prepare(
        "SELECT data, mime_type FROM project_assets WHERE project_id = ? AND type IN ('reference_image', 'logo', 'icon')"
      )
      const refs = assetsStmt.all(project_id) as { data: Buffer; mime_type: string }[]
      if (refs.length > 0) {
        referenceImages = refs.map(r => ({
          base64Data: r.data.toString('base64'),
          mimeType: r.mime_type,
        }))
      }
    } catch (err) {
      console.error('Failed to load reference images:', err)
    }

    // Generate the image
    const results = await generateImage({
      prompt,
      aspectRatio,
      numberOfImages: 1,
      referenceImages,
    })

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      )
    }

    const result = results[0]

    // Save the generated image to the database
    const imageId = generateId()
    const now = new Date().toISOString()

    const insertStmt = db.prepare(`
      INSERT INTO generated_images (id, project_id, prompt, image_data, width, height, model, is_upscaled, visual_concept_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'nano-banana', 0, ?, ?)
    `)

    // Convert base64 to Buffer for storage
    const imageBuffer = Buffer.from(result.base64Data, 'base64')
    insertStmt.run(imageId, project_id, prompt, imageBuffer, result.width, result.height, visual_concept_index ?? null, now)

    const generatedImage: GeneratedImage = {
      id: imageId,
      project_id,
      prompt,
      image_data: result.base64Data,
      width: result.width,
      height: result.height,
      model: 'nano-banana',
      is_upscaled: false,
      visual_concept_index,
      created_at: now,
    }

    return NextResponse.json(generatedImage, { status: 201 })
  } catch (error: unknown) {
    console.error('Error generating image:', error)

    // Check for rate limit errors
    const errorObj = error as { status?: number; message?: string }
    if (errorObj.status === 429) {
      return NextResponse.json(
        { error: 'API rate limit exceeded. Please wait a minute and try again.' },
        { status: 429 }
      )
    }

    // Check for quota errors in the message
    const errorMessage = errorObj.message || String(error)
    if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later or check your API plan.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    )
  }
}

// GET /api/images/generate - Get generated images for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    const stmt = db.prepare(`
      SELECT id, project_id, prompt, width, height, model, is_upscaled, parent_image_id, visual_concept_index, created_at
      FROM generated_images
      WHERE project_id = ?
      ORDER BY created_at DESC
    `)

    const images = stmt.all(projectId) as Omit<GeneratedImage, 'image_data'>[]

    return NextResponse.json(images)
  } catch (error) {
    console.error('Error fetching generated images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generated images' },
      { status: 500 }
    )
  }
}
