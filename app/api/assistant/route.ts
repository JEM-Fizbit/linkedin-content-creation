import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId, safeJsonParse } from '@/lib/utils'
import anthropic, { SYSTEM_PROMPT, isConfigured } from '@/lib/claude'
import { composeSystemPrompt } from '@/lib/prompts/compose'
import { UI_MANIPULATION_TOOLS, ASSISTANT_SYSTEM_PROMPT, parseToolCalls } from '@/lib/claude/tools'
import { generateImage, refineImage, type ReferenceImage } from '@/lib/gemini'
import type { Message, Project, Output, AssistantAction, AssistantResponse, ContentType, VisualConcept, GeneratedImage } from '@/types'

interface DbOutput {
  id: string
  project_id: string
  hooks: string
  body_content: string
  intros: string
  titles: string
  ctas: string
  visual_concepts: string
  selected_hook_index: number
  selected_body_index: number
  selected_intro_index: number
  selected_title_index: number
  selected_cta_index: number
  selected_visual_index: number
}

// Map content type to database field names
const CONTENT_TYPE_MAP: Record<ContentType, { arrayField: string; indexField: string }> = {
  hook: { arrayField: 'hooks', indexField: 'selected_hook_index' },
  body: { arrayField: 'body_content', indexField: 'selected_body_index' },
  intro: { arrayField: 'intros', indexField: 'selected_intro_index' },
  title: { arrayField: 'titles', indexField: 'selected_title_index' },
  cta: { arrayField: 'ctas', indexField: 'selected_cta_index' },
  visual: { arrayField: 'visual_concepts', indexField: 'selected_visual_index' },
}

// POST /api/assistant - Send message to AI assistant with tool use capabilities
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, message } = body

    if (!project_id || !message) {
      return NextResponse.json(
        { error: 'project_id and message are required' },
        { status: 400 }
      )
    }

    // Check if Claude is configured
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'Claude API is not configured. Please set ANTHROPIC_API_KEY in .env.local' },
        { status: 503 }
      )
    }

    // Get project and output
    const projectStmt = db.prepare('SELECT * FROM projects WHERE id = ?')
    const project = projectStmt.get(project_id) as Project | undefined

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const outputStmt = db.prepare('SELECT * FROM outputs WHERE project_id = ?')
    const output = outputStmt.get(project_id) as DbOutput | undefined

    // Get existing messages for context
    const messagesStmt = db.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC')
    const existingMessages = messagesStmt.all(project_id) as Message[]

    // Save user message
    const userMessageId = generateId()
    const now = new Date().toISOString()

    const insertUserMsg = db.prepare(`
      INSERT INTO messages (id, project_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `)
    insertUserMsg.run(userMessageId, project_id, message, now)

    // Build conversation history for Claude
    const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []

    // Build context string with project info, sources, and images
    let contextString = `Project context:
- Platform: ${project.platform}
- Topic: ${project.topic}
- Target audience: ${project.target_audience || 'Not specified'}
- Content style: ${project.content_style || 'Not specified'}
- Current step: ${project.current_step}

Current content:
${output ? formatCurrentContent(output) : 'No content generated yet.'}`

    // Inject text sources
    try {
      const sourcesStmt = db.prepare(
        'SELECT title, content FROM project_sources WHERE project_id = ? AND enabled = 1 ORDER BY created_at ASC'
      )
      const sources = sourcesStmt.all(project_id) as { title: string; content: string }[]
      if (sources.length > 0) {
        let totalChars = 0
        const MAX_CHARS = 6000
        contextString += '\n\n--- Reference Materials ---\n'
        contextString += 'The user has uploaded these information sources:\n\n'
        for (const source of sources) {
          const available = MAX_CHARS - totalChars
          if (available <= 0) break
          const content = source.content.length > available
            ? source.content.substring(0, available) + '...[truncated]'
            : source.content
          contextString += `### ${source.title}\n${content}\n\n`
          totalChars += content.length
        }
      }
    } catch (err) {
      console.error('Failed to load sources for assistant:', err)
    }

    // Inject reference image info (with IDs for carousel placement)
    try {
      const assetsStmt = db.prepare(
        'SELECT id, type, filename FROM project_assets WHERE project_id = ?'
      )
      const assets = assetsStmt.all(project_id) as { id: string; type: string; filename: string }[]
      if (assets.length > 0) {
        contextString += '\n\n--- Reference Images ---\n'
        contextString += 'The user has uploaded these reference images (use the asset_id for set_slide_image):\n'
        assets.forEach((asset, i) => {
          contextString += `  ${i + 1}. ${asset.filename} (${asset.type.replace('_', ' ')}) - asset_id: ${asset.id}\n`
        })
        contextString += '\nFor image generation, set use_references=true. For carousel slides, use set_slide_image with the asset_id.\n'
      }
    } catch (err) {
      console.error('Failed to load assets for assistant:', err)
    }

    // Inject thumbnail info matched to visual concepts (same ordering as UI)
    try {
      const visualConcepts: VisualConcept[] = output
        ? safeJsonParse(output.visual_concepts, [])
        : []

      const imagesStmt = db.prepare(
        'SELECT id, prompt, width, height FROM generated_images WHERE project_id = ? ORDER BY created_at DESC'
      )
      const allImages = imagesStmt.all(project_id) as { id: string; prompt: string; width: number; height: number }[]

      if (visualConcepts.length > 0 && allImages.length > 0) {
        contextString += '\n\n--- Thumbnails ---\n'
        contextString += 'These are the thumbnails currently displayed (use the id when calling refine_image):\n'
        visualConcepts.forEach((concept, i) => {
          // Match using same logic as the UI (find most recent matching image)
          const matchingImage = allImages.find(
            img => img.prompt === concept.description || img.prompt?.includes(concept.description?.substring(0, 50))
          )
          if (matchingImage) {
            const promptExcerpt = matchingImage.prompt.length > 80 ? matchingImage.prompt.substring(0, 80) + '...' : matchingImage.prompt
            contextString += `  Thumbnail ${i + 1}: "${promptExcerpt}" (id: ${matchingImage.id}, ${matchingImage.width}x${matchingImage.height})\n`
          } else {
            contextString += `  Thumbnail ${i + 1}: [not yet generated] concept: "${concept.description?.substring(0, 60)}"\n`
          }
        })
      } else if (allImages.length > 0) {
        // No visual concepts but images exist (fallback)
        contextString += '\n\n--- Generated Images ---\n'
        allImages.forEach((img, i) => {
          const promptExcerpt = img.prompt.length > 80 ? img.prompt.substring(0, 80) + '...' : img.prompt
          contextString += `  Image ${i + 1}: "${promptExcerpt}" (id: ${img.id}, ${img.width}x${img.height})\n`
        })
        contextString += '\nUse the image id when calling refine_image.\n'
      }
    } catch (err) {
      console.error('Failed to load generated images for assistant:', err)
    }

    // Inject carousel context when on carousel step
    if (project.current_step === 'carousel') {
      try {
        const carouselStmt = db.prepare('SELECT slides FROM carousel_outputs WHERE project_id = ?')
        const carouselRow = carouselStmt.get(project_id) as { slides: string } | undefined
        if (carouselRow) {
          const slides = safeJsonParse(carouselRow.slides, []) as Array<{
            headline: string
            body?: string
            cta?: string
            image_id?: string
            visual_prompt?: string
          }>
          contextString += '\n\n--- Carousel Slides ---\n'
          contextString += 'Current carousel slides (use 0-based slide_index for tools):\n'
          slides.forEach((slide, i) => {
            const imageStatus = slide.image_id ? `image: ${slide.image_id}` : 'no image'
            contextString += `  Slide ${i + 1}: "${slide.headline}" (${imageStatus})\n`
            if (slide.body) contextString += `    Body: ${slide.body.substring(0, 50)}${slide.body.length > 50 ? '...' : ''}\n`
            if (slide.cta) contextString += `    CTA: ${slide.cta}\n`
          })
          contextString += '\nUse edit_carousel_slide to modify text, set_slide_image to add a reference image.\n'
        }
      } catch (err) {
        console.error('Failed to load carousel for assistant:', err)
      }
    }

    // Add context as the first message
    conversationHistory.push({
      role: 'user',
      content: `${contextString}\n\nUser message: ${message}`
    })

    // Add existing conversation (skip empty messages)
    for (const msg of existingMessages.slice(-10)) {
      if (!msg.content || msg.content.trim() === '') continue
      conversationHistory.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })
    }

    // Add the new user message
    conversationHistory.push({
      role: 'user',
      content: message
    })

    // Ensure no consecutive same-role messages (Claude API requirement)
    const dedupedHistory: typeof conversationHistory = []
    for (const msg of conversationHistory) {
      if (dedupedHistory.length > 0 && dedupedHistory[dedupedHistory.length - 1].role === msg.role) {
        dedupedHistory[dedupedHistory.length - 1].content += '\n\n' + msg.content
      } else {
        dedupedHistory.push(msg)
      }
    }
    conversationHistory.length = 0
    conversationHistory.push(...dedupedHistory)

    // Call Claude API with tools
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `${composeSystemPrompt(SYSTEM_PROMPT, project.platform)}\n\n${ASSISTANT_SYSTEM_PROMPT}`,
      tools: UI_MANIPULATION_TOOLS,
      messages: conversationHistory
    })

    // Process response and extract tool calls
    let assistantMessage = ''
    const toolCalls: { name: string; input: Record<string, unknown> }[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          input: block.input as Record<string, unknown>
        })
      }
    }

    // Handle truncated response
    if (response.stop_reason === 'max_tokens' && !assistantMessage && toolCalls.length === 0) {
      assistantMessage = 'My response was too long and got cut off. Could you try a more specific request?'
    }

    // Parse tool calls into actions
    const actions = parseToolCalls(toolCalls)

    // Separate image actions, carousel actions, and content actions
    const carouselActionTypes = ['edit_carousel_slide', 'set_slide_image', 'remove_slide_image']
    const imageActionTypes = ['generate_image', 'refine_image']
    const contentActions = actions.filter(a => !imageActionTypes.includes(a.type) && !carouselActionTypes.includes(a.type))
    const imageActions = actions.filter(a => imageActionTypes.includes(a.type))
    const carouselActions = actions.filter(a => carouselActionTypes.includes(a.type))

    // Execute content actions on the database
    if (contentActions.length > 0 && output) {
      await executeActions(project_id, output, contentActions)
    }

    // Execute carousel actions
    let carouselUpdated = false
    if (carouselActions.length > 0) {
      carouselUpdated = await executeCarouselActions(project_id, carouselActions)
    }

    // Execute image actions
    let generatedImageResult: Omit<GeneratedImage, 'image_data'> | undefined
    if (imageActions.length > 0) {
      for (const action of imageActions) {
        try {
          generatedImageResult = await executeImageAction(project_id, action)
        } catch (err) {
          console.error('Failed to execute image action:', err)
          const errMsg = err instanceof Error ? err.message : 'Unknown error'
          if (!assistantMessage) {
            assistantMessage = `I tried to generate/refine the image but the model responded: "${errMsg}"`
          } else {
            assistantMessage += `\n\n(Note: The image generation model responded: "${errMsg}")`
          }
        }
      }
    }

    // Ensure assistant message is never empty (Claude sometimes returns only tool_use blocks)
    if (!assistantMessage.trim()) {
      if (carouselUpdated) {
        assistantMessage = 'Done — I\'ve updated the carousel slide.'
      } else if (contentActions.length > 0) {
        assistantMessage = 'Done — I\'ve updated the content.'
      } else if (generatedImageResult) {
        assistantMessage = 'Done — the image has been generated.'
      } else if (imageActions.length > 0) {
        // Image actions were attempted but all failed (errors already appended above)
      } else {
        assistantMessage = 'I processed your request.'
      }
    }

    // Save assistant message
    const assistantMessageId = generateId()
    const assistantNow = new Date().toISOString()

    const insertAssistantMsg = db.prepare(`
      INSERT INTO messages (id, project_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, ?)
    `)
    insertAssistantMsg.run(assistantMessageId, project_id, assistantMessage, assistantNow)

    // Get updated output if content actions were taken
    let updatedOutput: Output | undefined
    if (contentActions.length > 0) {
      const refreshedOutput = outputStmt.get(project_id) as DbOutput | undefined
      if (refreshedOutput) {
        updatedOutput = parseDbOutput(refreshedOutput)
      }
    }

    const assistantResponse: AssistantResponse = {
      message: assistantMessage,
      actions: actions.length > 0 ? actions : undefined,
    }

    return NextResponse.json({
      userMessage: {
        id: userMessageId,
        project_id,
        role: 'user',
        content: message,
        created_at: now,
      },
      assistantMessage: {
        id: assistantMessageId,
        project_id,
        role: 'assistant',
        content: assistantMessage,
        created_at: assistantNow,
      },
      response: assistantResponse,
      output: updatedOutput,
      generatedImage: generatedImageResult,
    })
  } catch (error) {
    console.error('Error in assistant:', error)
    return NextResponse.json(
      { error: 'Failed to process assistant request' },
      { status: 500 }
    )
  }
}

// Format current content for context
function formatCurrentContent(output: DbOutput): string {
  const hooks = safeJsonParse(output.hooks, [])
  const intros = safeJsonParse(output.intros, [])
  const titles = safeJsonParse(output.titles, [])
  const ctas = safeJsonParse(output.ctas, [])
  const visuals = safeJsonParse(output.visual_concepts, [])

  let content = ''

  if (hooks.length > 0) {
    content += 'Hooks:\n'
    hooks.forEach((h: string, i: number) => {
      content += `  ${i + 1}. ${h}${i === output.selected_hook_index ? ' (selected)' : ''}\n`
    })
  }

  if (output.body_content) {
    content += `\nBody content:\n  ${output.body_content.substring(0, 200)}...\n`
  }

  if (intros.length > 0) {
    content += '\nIntros:\n'
    intros.forEach((intro: string, i: number) => {
      content += `  ${i + 1}. ${intro.substring(0, 100)}...${i === output.selected_intro_index ? ' (selected)' : ''}\n`
    })
  }

  if (titles.length > 0) {
    content += '\nTitles:\n'
    titles.forEach((title: string, i: number) => {
      content += `  ${i + 1}. ${title}${i === output.selected_title_index ? ' (selected)' : ''}\n`
    })
  }

  if (ctas.length > 0) {
    content += '\nCTAs:\n'
    ctas.forEach((cta: string, i: number) => {
      content += `  ${i + 1}. ${cta}${i === output.selected_cta_index ? ' (selected)' : ''}\n`
    })
  }

  if (visuals.length > 0) {
    content += '\nVisual concepts:\n'
    visuals.forEach((v: VisualConcept, i: number) => {
      content += `  ${i + 1}. ${v.description}${i === output.selected_visual_index ? ' (selected)' : ''}\n`
    })
  }

  return content || 'No content yet.'
}

// Execute content actions on the database
async function executeActions(projectId: string, output: DbOutput, actions: AssistantAction[]) {
  for (const action of actions) {
    // Skip image and carousel actions (handled separately)
    if (action.type === 'generate_image' || action.type === 'refine_image') continue
    if (action.type === 'edit_carousel_slide' || action.type === 'set_slide_image' || action.type === 'remove_slide_image') continue

    const mapping = CONTENT_TYPE_MAP[action.content_type]
    if (!mapping) continue

    switch (action.type) {
      case 'edit_card': {
        if (action.content_type === 'body') {
          // Body is a string, not array
          db.prepare('UPDATE outputs SET body_content = ?, updated_at = ? WHERE project_id = ?')
            .run(action.new_content, new Date().toISOString(), projectId)
        } else {
          // Other content types are arrays
          const currentValue = (output as unknown as Record<string, string>)[mapping.arrayField]
          const items = safeJsonParse(currentValue, []) as (string | VisualConcept)[]
          if (action.index >= 0 && action.index < items.length) {
            if (action.content_type === 'visual') {
              items[action.index] = { description: action.new_content }
            } else {
              items[action.index] = action.new_content
            }
            db.prepare(`UPDATE outputs SET ${mapping.arrayField} = ?, updated_at = ? WHERE project_id = ?`)
              .run(JSON.stringify(items), new Date().toISOString(), projectId)
          }
        }
        break
      }

      case 'remove_card': {
        if (action.content_type === 'body') {
          // Can't remove body, skip
          continue
        }
        const currentValue = (output as unknown as Record<string, string>)[mapping.arrayField]
        const items = safeJsonParse(currentValue, []) as (string | VisualConcept)[]
        if (action.index >= 0 && action.index < items.length) {
          items.splice(action.index, 1)
          db.prepare(`UPDATE outputs SET ${mapping.arrayField} = ?, updated_at = ? WHERE project_id = ?`)
            .run(JSON.stringify(items), new Date().toISOString(), projectId)
        }
        break
      }

      case 'select_card': {
        db.prepare(`UPDATE outputs SET ${mapping.indexField} = ?, updated_at = ? WHERE project_id = ?`)
          .run(action.index, new Date().toISOString(), projectId)
        break
      }

      // regenerate_section and add_more would be handled by the frontend
      // since they require Claude to generate new content
    }
  }
}

// Execute carousel actions on the database
async function executeCarouselActions(projectId: string, actions: AssistantAction[]): Promise<boolean> {
  try {
    const carouselStmt = db.prepare('SELECT id, slides FROM carousel_outputs WHERE project_id = ?')
    const carousel = carouselStmt.get(projectId) as { id: string; slides: string } | undefined

    if (!carousel) {
      console.error('No carousel found for project:', projectId)
      return false
    }

    const slides = safeJsonParse(carousel.slides, []) as Array<{
      id: string
      position: number
      headline: string
      body?: string
      cta?: string
      image_id?: string | null
      visual_prompt?: string
      background_color?: string
      rendered_image?: string
    }>

    let modified = false

    for (const action of actions) {
      if (action.type === 'edit_carousel_slide') {
        if (action.slide_index >= 0 && action.slide_index < slides.length) {
          // Update the appropriate field
          const slide = slides[action.slide_index]
          switch (action.field) {
            case 'headline':
              slide.headline = action.value
              break
            case 'body':
              slide.body = action.value
              break
            case 'cta':
              slide.cta = action.value
              break
            case 'visual_prompt':
              slide.visual_prompt = action.value
              break
          }
          modified = true
        }
      } else if (action.type === 'set_slide_image') {
        if (action.slide_index >= 0 && action.slide_index < slides.length) {
          // Verify the asset exists
          const assetStmt = db.prepare('SELECT id FROM project_assets WHERE id = ? AND project_id = ?')
          const asset = assetStmt.get(action.asset_id, projectId)
          if (asset) {
            slides[action.slide_index].image_id = action.asset_id
            modified = true
          } else {
            console.error('Asset not found:', action.asset_id)
          }
        }
      } else if (action.type === 'remove_slide_image') {
        if (action.slide_index >= 0 && action.slide_index < slides.length) {
          slides[action.slide_index].image_id = null
          modified = true
        }
      }
    }

    if (modified) {
      const now = new Date().toISOString()
      db.prepare('UPDATE carousel_outputs SET slides = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(slides), now, carousel.id)
    }

    return modified
  } catch (err) {
    console.error('Failed to execute carousel actions:', err)
    return false
  }
}

// Fetch reference images from project_assets
function fetchReferenceImages(projectId: string): ReferenceImage[] {
  const assetsStmt = db.prepare(
    "SELECT data, mime_type FROM project_assets WHERE project_id = ? AND type IN ('reference_image', 'logo', 'icon')"
  )
  const refs = assetsStmt.all(projectId) as { data: Buffer; mime_type: string }[]
  return refs.map(r => ({
    base64Data: r.data.toString('base64'),
    mimeType: r.mime_type,
  }))
}

// Execute an image action (generate or refine)
async function executeImageAction(
  projectId: string,
  action: AssistantAction
): Promise<Omit<GeneratedImage, 'image_data'>> {
  if (action.type === 'generate_image') {
    const referenceImages = action.use_references ? fetchReferenceImages(projectId) : undefined

    const results = await generateImage({
      prompt: action.prompt,
      aspectRatio: (action.aspect_ratio as '1:1' | '16:9' | '9:16' | '4:3') || '1:1',
      numberOfImages: 1,
      referenceImages,
    })

    if (results.length === 0) {
      throw new Error('Image generation returned no results')
    }

    const result = results[0]
    const imageId = generateId()
    const now = new Date().toISOString()

    const insertStmt = db.prepare(`
      INSERT INTO generated_images (id, project_id, prompt, image_data, width, height, model, is_upscaled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'nano-banana', 0, ?)
    `)
    const imageBuffer = Buffer.from(result.base64Data, 'base64')
    insertStmt.run(imageId, projectId, action.prompt, imageBuffer, result.width, result.height, now)

    return {
      id: imageId,
      project_id: projectId,
      prompt: action.prompt,
      width: result.width,
      height: result.height,
      model: 'nano-banana',
      is_upscaled: false,
      created_at: now,
    }
  }

  if (action.type === 'refine_image') {
    // Fetch original image
    const imageStmt = db.prepare('SELECT id, project_id, prompt, image_data FROM generated_images WHERE id = ?')
    const originalImage = imageStmt.get(action.image_id) as {
      id: string; project_id: string; prompt: string; image_data: Buffer | null
    } | undefined

    if (!originalImage) {
      throw new Error(`Image not found: ${action.image_id}`)
    }

    if (!originalImage.image_data) {
      throw new Error('Image data not available for refinement. Try regenerating the image first.')
    }

    const referenceImages = action.use_references ? fetchReferenceImages(projectId) : undefined

    const results = await refineImage(
      originalImage.prompt,
      action.refinement_prompt,
      originalImage.image_data.toString('base64'),
      referenceImages
    )

    if (results.length === 0) {
      throw new Error('Image refinement returned no results')
    }

    const result = results[0]
    const imageId = generateId()
    const now = new Date().toISOString()
    const combinedPrompt = `${originalImage.prompt}\n\nRefinements: ${action.refinement_prompt}`

    const insertStmt = db.prepare(`
      INSERT INTO generated_images (id, project_id, prompt, image_data, width, height, model, is_upscaled, parent_image_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'nano-banana', 0, ?, ?)
    `)
    const imageBuffer = Buffer.from(result.base64Data, 'base64')
    insertStmt.run(imageId, projectId, combinedPrompt, imageBuffer, result.width, result.height, action.image_id, now)

    return {
      id: imageId,
      project_id: projectId,
      prompt: combinedPrompt,
      width: result.width,
      height: result.height,
      model: 'nano-banana',
      is_upscaled: false,
      parent_image_id: action.image_id,
      created_at: now,
    }
  }

  throw new Error(`Unknown image action type: ${(action as AssistantAction).type}`)
}

// Parse DB output to Output type
function parseDbOutput(dbOutput: DbOutput): Output {
  return {
    id: dbOutput.id,
    project_id: dbOutput.project_id,
    hooks: safeJsonParse(dbOutput.hooks, []),
    hooks_original: [],
    selected_hook_index: dbOutput.selected_hook_index,
    body_content: dbOutput.body_content,
    body_content_original: '',
    selected_body_index: dbOutput.selected_body_index,
    intros: safeJsonParse(dbOutput.intros, []),
    intros_original: [],
    selected_intro_index: dbOutput.selected_intro_index,
    titles: safeJsonParse(dbOutput.titles, []),
    titles_original: [],
    selected_title_index: dbOutput.selected_title_index,
    ctas: safeJsonParse(dbOutput.ctas, []),
    ctas_original: [],
    selected_cta_index: dbOutput.selected_cta_index,
    visual_concepts: safeJsonParse(dbOutput.visual_concepts, []),
    visual_concepts_original: [],
    selected_visual_index: dbOutput.selected_visual_index,
    created_at: '',
    updated_at: '',
  }
}
