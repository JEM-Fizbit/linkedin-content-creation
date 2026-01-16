import { GoogleGenAI } from '@google/genai'

// Initialize Google GenAI client
let ai: GoogleGenAI | null = null

// Check if the API is configured
export function isConfigured(): boolean {
  return !!process.env.GOOGLE_API_KEY
}

// Initialize the client lazily
function getClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured')
    }
    ai = new GoogleGenAI({ apiKey })
  }
  return ai
}

// Image generation options
export interface ImageGenerationOptions {
  prompt: string
  width?: number
  height?: number
  numberOfImages?: number
  negativePrompt?: string
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
}

// Generated image result
export interface GeneratedImageResult {
  base64Data: string
  mimeType: string
  width: number
  height: number
}

// Generate an image using Nano Banana (Gemini 2.5 Flash Image)
export async function generateImage(options: ImageGenerationOptions): Promise<GeneratedImageResult[]> {
  const {
    prompt,
    numberOfImages = 1,
    aspectRatio = '1:1',
  } = options

  if (!isConfigured()) {
    throw new Error('Google API is not configured. Please set GOOGLE_API_KEY in .env.local')
  }

  const client = getClient()

  try {
    // Generate the image using Nano Banana (gemini-2.5-flash-image)
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    })

    const images: GeneratedImageResult[] = []

    // Extract images from response
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts || []
      for (const part of parts) {
        if (part.inlineData) {
          images.push({
            base64Data: part.inlineData.data || '',
            mimeType: part.inlineData.mimeType || 'image/png',
            width: aspectRatio === '16:9' ? 1792 : aspectRatio === '9:16' ? 1024 : 1024,
            height: aspectRatio === '9:16' ? 1792 : aspectRatio === '16:9' ? 1024 : 1024,
          })
        }
      }
    }

    if (images.length === 0) {
      throw new Error('No images were generated')
    }

    return images.slice(0, numberOfImages)
  } catch (error) {
    console.error('Error generating image:', error)
    throw error
  }
}

// Upscale an image (if supported)
export async function upscaleImage(
  base64Data: string,
  targetWidth: number = 4096,
  targetHeight: number = 4096
): Promise<GeneratedImageResult> {
  if (!isConfigured()) {
    throw new Error('Google API is not configured')
  }

  // Currently, the Gemini API doesn't have a direct upscale endpoint
  throw new Error('Image upscaling is not yet supported. Please regenerate the image at a higher resolution.')
}

// Refine an existing image with a new prompt
export async function refineImage(
  originalPrompt: string,
  refinementPrompt: string,
  base64Data?: string
): Promise<GeneratedImageResult[]> {
  if (!isConfigured()) {
    throw new Error('Google API is not configured')
  }

  // Combine prompts for refinement
  const combinedPrompt = `${originalPrompt}\n\nRefinements: ${refinementPrompt}`

  // Generate new image with refined prompt
  return generateImage({
    prompt: combinedPrompt,
    numberOfImages: 1,
  })
}

// Generate thumbnail concepts as actual images
export async function generateThumbnail(
  topic: string,
  style: string,
  includeText?: string
): Promise<GeneratedImageResult[]> {
  const thumbnailPrompt = `Create a YouTube thumbnail image for a video about "${topic}".
Style: ${style}
${includeText ? `Include text: "${includeText}"` : ''}
The thumbnail should be:
- Eye-catching and professional
- High contrast with bold colors
- Clear focal point
- Optimized for small display sizes`

  return generateImage({
    prompt: thumbnailPrompt,
    aspectRatio: '16:9',
    numberOfImages: 1,
  })
}

export default {
  isConfigured,
  generateImage,
  upscaleImage,
  refineImage,
  generateThumbnail,
}
