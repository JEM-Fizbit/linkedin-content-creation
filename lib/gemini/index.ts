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

// Reference image for multimodal input
export interface ReferenceImage {
  base64Data: string
  mimeType: string
}

// Image generation options
export interface ImageGenerationOptions {
  prompt: string
  sourceImage?: ReferenceImage  // The original image to modify (for refinement/editing)
  referenceImages?: ReferenceImage[]  // Style/person references for guidance
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
    sourceImage,
    referenceImages,
    numberOfImages = 1,
    aspectRatio = '1:1',
  } = options

  if (!isConfigured()) {
    throw new Error('Google API is not configured. Please set GOOGLE_API_KEY in .env.local')
  }

  const client = getClient()

  try {
    type ContentPart = { text: string } | { inlineData: { data: string; mimeType: string } }
    let contents: string | ContentPart[]

    if (sourceImage) {
      // REFINEMENT MODE: editing an existing image
      const parts: ContentPart[] = []
      parts.push({ text: 'Here is the original image to modify:' })
      parts.push({
        inlineData: { data: sourceImage.base64Data, mimeType: sourceImage.mimeType }
      })

      if (referenceImages && referenceImages.length > 0) {
        parts.push({ text: '\nHere are reference images to use as guidance:' })
        for (const img of referenceImages.slice(0, 3)) {
          parts.push({
            inlineData: { data: img.base64Data, mimeType: img.mimeType }
          })
        }
        parts.push({ text: `\nModify the original image according to these instructions, using the reference images as guidance: ${prompt}` })
      } else {
        parts.push({ text: `\nModify the original image according to these instructions: ${prompt}` })
      }

      contents = parts
    } else if (referenceImages && referenceImages.length > 0) {
      // GENERATION MODE with style references
      const parts: ContentPart[] = []
      parts.push({ text: 'Reference images for style and branding:' })
      for (const img of referenceImages.slice(0, 3)) {
        parts.push({
          inlineData: { data: img.base64Data, mimeType: img.mimeType }
        })
      }
      parts.push({ text: `\nGenerate a new image inspired by the style and branding of the references above. Prompt: ${prompt}` })
      contents = parts
    } else {
      // PLAIN GENERATION: text prompt only
      contents = prompt
    }

    // Log the prompt for debugging
    console.log('[Gemini] Generating image with prompt:', typeof contents === 'string' ? contents.substring(0, 200) : '[multimodal input]')
    console.log('[Gemini] Using reference images:', referenceImages?.length || 0)
    console.log('[Gemini] Using source image (refinement):', !!sourceImage)

    // Generate the image using Nano Banana (gemini-2.5-flash-image)
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    })

    // Log response structure for debugging
    console.log('[Gemini] Response candidates:', response.candidates?.length || 0)
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      console.log('[Gemini] Candidate finish reason:', candidate.finishReason)
      console.log('[Gemini] Parts count:', candidate.content?.parts?.length || 0)

      // Log safety ratings if present
      if (candidate.safetyRatings) {
        console.log('[Gemini] Safety ratings:', JSON.stringify(candidate.safetyRatings))
      }
    }

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
      // Check for text response explaining why no image was generated
      let explanation = ''
      if (response.candidates && response.candidates.length > 0) {
        const textParts = (response.candidates[0].content?.parts || [])
          .filter(p => 'text' in p)
          .map(p => (p as { text: string }).text)
        if (textParts.length > 0) {
          explanation = textParts.join(' ')
          console.error('[Gemini] Model returned text instead of image:', explanation)
        }
      }

      // Also check for blocked prompts
      if (response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('The image request was blocked by content safety filters. Try a different description.')
      }

      throw new Error(explanation || 'No images were generated. The model may be busy or the request was filtered.')
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
  base64Data?: string,
  referenceImages?: ReferenceImage[]
): Promise<GeneratedImageResult[]> {
  if (!isConfigured()) {
    throw new Error('Google API is not configured')
  }

  // Pass the original image as sourceImage so Gemini can see and modify it
  return generateImage({
    prompt: refinementPrompt,
    sourceImage: base64Data ? { base64Data, mimeType: 'image/png' } : undefined,
    referenceImages,
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
