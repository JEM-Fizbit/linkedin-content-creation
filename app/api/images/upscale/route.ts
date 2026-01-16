import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import { generateImage, isConfigured } from '@/lib/gemini'
import type { GeneratedImage, UpscaleImageRequest } from '@/types'

// POST /api/images/upscale - Upscale an existing image to higher resolution
// Implementation: Regenerate the image at higher resolution using the original prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as UpscaleImageRequest
    const { image_id } = body

    if (!image_id) {
      return NextResponse.json(
        { error: 'image_id is required' },
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
      is_upscaled: number
    } | undefined

    if (!originalImage) {
      return NextResponse.json(
        { error: 'Original image not found' },
        { status: 404 }
      )
    }

    if (originalImage.is_upscaled === 1) {
      return NextResponse.json(
        { error: 'Image has already been upscaled' },
        { status: 400 }
      )
    }

    // Add "4K high resolution" qualifier to the prompt for better quality
    const upscalePrompt = `${originalImage.prompt}\n\n[HIGH RESOLUTION 4K UHD quality, extremely detailed, sharp focus, professional photography]`

    // Generate a new high-resolution image using the enhanced prompt
    const results = await generateImage({
      prompt: upscalePrompt,
      numberOfImages: 1,
      aspectRatio: '16:9', // Use 16:9 for YouTube thumbnails
    })

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate upscaled image' },
        { status: 500 }
      )
    }

    const result = results[0]

    // Save the upscaled image to the database
    const newImageId = generateId()
    const now = new Date().toISOString()

    const insertStmt = db.prepare(`
      INSERT INTO generated_images (id, project_id, prompt, image_data, width, height, model, is_upscaled, parent_image_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'nano-banana-4k', 1, ?, ?)
    `)

    const imageBuffer = Buffer.from(result.base64Data, 'base64')
    insertStmt.run(
      newImageId,
      originalImage.project_id,
      originalImage.prompt, // Keep the original prompt for reference
      imageBuffer,
      result.width,
      result.height,
      image_id, // parent_image_id
      now
    )

    const upscaledImage: GeneratedImage = {
      id: newImageId,
      project_id: originalImage.project_id,
      prompt: originalImage.prompt,
      image_data: result.base64Data,
      width: result.width,
      height: result.height,
      model: 'nano-banana-4k',
      is_upscaled: true,
      parent_image_id: image_id,
      created_at: now,
    }

    return NextResponse.json(upscaledImage, { status: 201 })
  } catch (error) {
    console.error('Error upscaling image:', error)
    return NextResponse.json(
      { error: 'Failed to upscale image' },
      { status: 500 }
    )
  }
}
