import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import { refineImage, isConfigured, type ReferenceImage } from '@/lib/gemini'
import type { GeneratedImage, RefineImageRequest } from '@/types'

// POST /api/images/refine - Refine an existing image with a new prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RefineImageRequest
    const { image_id, refinement_prompt } = body

    if (!image_id) {
      return NextResponse.json(
        { error: 'image_id is required' },
        { status: 400 }
      )
    }

    if (!refinement_prompt) {
      return NextResponse.json(
        { error: 'refinement_prompt is required' },
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

    // Get the original image
    const imageStmt = db.prepare('SELECT * FROM generated_images WHERE id = ?')
    const originalImage = imageStmt.get(image_id) as {
      id: string
      project_id: string
      prompt: string
      image_data: Buffer | null
      width: number
      height: number
      model: string
    } | undefined

    if (!originalImage) {
      return NextResponse.json(
        { error: 'Original image not found' },
        { status: 404 }
      )
    }

    // Fetch reference images for this project (if any)
    let referenceImages: ReferenceImage[] | undefined
    try {
      const assetsStmt = db.prepare(
        "SELECT data, mime_type FROM project_assets WHERE project_id = ? AND type IN ('reference_image', 'logo', 'icon')"
      )
      const refs = assetsStmt.all(originalImage.project_id) as { data: Buffer; mime_type: string }[]
      if (refs.length > 0) {
        referenceImages = refs.map(r => ({
          base64Data: r.data.toString('base64'),
          mimeType: r.mime_type,
        }))
      }
    } catch (err) {
      console.error('Failed to load reference images for refinement:', err)
    }

    // Refine the image with the new prompt, original image, and reference images
    const results = await refineImage(
      originalImage.prompt,
      refinement_prompt,
      originalImage.image_data ? originalImage.image_data.toString('base64') : undefined,
      referenceImages
    )

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to refine image' },
        { status: 500 }
      )
    }

    const result = results[0]

    // Save the refined image to the database
    const newImageId = generateId()
    const now = new Date().toISOString()
    const combinedPrompt = `${originalImage.prompt}\n\nRefinements: ${refinement_prompt}`

    const insertStmt = db.prepare(`
      INSERT INTO generated_images (id, project_id, prompt, image_data, width, height, model, is_upscaled, parent_image_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'nano-banana', 0, ?, ?)
    `)

    const imageBuffer = Buffer.from(result.base64Data, 'base64')
    insertStmt.run(
      newImageId,
      originalImage.project_id,
      combinedPrompt,
      imageBuffer,
      result.width,
      result.height,
      image_id,
      now
    )

    const generatedImage: GeneratedImage = {
      id: newImageId,
      project_id: originalImage.project_id,
      prompt: combinedPrompt,
      image_data: result.base64Data,
      width: result.width,
      height: result.height,
      model: 'nano-banana',
      is_upscaled: false,
      parent_image_id: image_id,
      created_at: now,
    }

    return NextResponse.json(generatedImage, { status: 201 })
  } catch (error) {
    console.error('Error refining image:', error)
    const message = error instanceof Error ? error.message : 'Failed to refine image'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
