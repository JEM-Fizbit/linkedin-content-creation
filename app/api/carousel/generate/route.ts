import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import Anthropic from '@anthropic-ai/sdk'
import db from '@/lib/db'
import type { CarouselSlide } from '@/types'

const anthropic = new Anthropic()

interface OutputRow {
  body_content: string
}

interface TemplateRow {
  id: string
  slide_count: number
}

interface CarouselOutputRow {
  id: string
  project_id: string
  template_id: string | null
  slides: string
  created_at: string
  updated_at: string
}

const CAROUSEL_GENERATION_PROMPT = `You are an expert content strategist specializing in creating engaging carousel content for LinkedIn and social media.

Given the following content, break it down into a compelling carousel with the specified number of slides.

Structure for each slide:
- Slide 1: Hook/attention grabber - the single most compelling insight or question
- Slides 2 to N-1: Key points - one clear, actionable point per slide
- Slide N: CTA/conclusion - a clear call to action or memorable takeaway

For each slide, provide:
1. headline: Bold, punchy text (max 8 words) - this is the main text
2. body: Supporting text that expands on the headline (max 25 words) - optional for some slides
3. visual_prompt: A description for generating an AI image that would complement this slide

Format your response as a JSON array of slide objects. Example:
[
  {
    "headline": "Stop chasing followers",
    "body": "The algorithm rewards value, not vanity metrics",
    "visual_prompt": "Minimalist illustration of a person turning away from a crowd towards a single golden lightbulb"
  },
  ...
]

Rules:
- Each headline should work standalone as a scroll-stopping statement
- Keep text concise - carousels are visual-first
- Create a narrative arc across slides
- Make the final slide drive action`

/**
 * POST /api/carousel/generate
 * Generate carousel slide content from body content
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, slide_count = 5, template_id, source_content } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    // Get the body content from project outputs if not provided
    let contentToProcess = source_content

    if (!contentToProcess) {
      const output = db.prepare(`
        SELECT body_content FROM outputs WHERE project_id = ?
      `).get(project_id) as OutputRow | undefined

      if (!output || !output.body_content) {
        return NextResponse.json(
          { error: 'No content found. Please generate body content first or provide source_content.' },
          { status: 400 }
        )
      }

      contentToProcess = output.body_content
    }

    // Determine slide count from template if provided
    let targetSlideCount = slide_count
    if (template_id) {
      const template = db.prepare(`
        SELECT id, slide_count FROM carousel_templates WHERE id = ?
      `).get(template_id) as TemplateRow | undefined

      if (template) {
        targetSlideCount = template.slide_count
      }
    }

    // Generate carousel content using Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `${CAROUSEL_GENERATION_PROMPT}

Number of slides: ${targetSlideCount}

Content to transform into carousel:
---
${contentToProcess}
---

Generate the carousel slides as a JSON array.`
        }
      ]
    })

    // Extract the text content
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse the JSON response
    let slidesData: Array<{ headline: string; body?: string; visual_prompt?: string }>

    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = textContent.text
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }
      slidesData = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse carousel response:', textContent.text)
      throw new Error('Failed to parse carousel content')
    }

    // Create carousel slides
    const slides: CarouselSlide[] = slidesData.map((data, index) => ({
      id: uuidv4(),
      position: index,
      headline: data.headline,
      body: data.body,
      visual_prompt: data.visual_prompt
    }))

    // Check for existing carousel output
    const existingOutput = db.prepare(`
      SELECT id FROM carousel_outputs WHERE project_id = ?
    `).get(project_id) as { id: string } | undefined

    const carouselId = existingOutput?.id || uuidv4()
    const now = new Date().toISOString()

    if (existingOutput) {
      // Update existing
      db.prepare(`
        UPDATE carousel_outputs
        SET template_id = ?, slides = ?, updated_at = ?
        WHERE id = ?
      `).run(template_id || null, JSON.stringify(slides), now, carouselId)
    } else {
      // Create new
      db.prepare(`
        INSERT INTO carousel_outputs (id, project_id, template_id, slides, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(carouselId, project_id, template_id || null, JSON.stringify(slides), now, now)
    }

    return NextResponse.json({
      id: carouselId,
      project_id,
      template_id: template_id || null,
      slides,
      created_at: now,
      updated_at: now
    })

  } catch (error) {
    console.error('Error generating carousel:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate carousel' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/carousel/generate?project_id=...
 * Get existing carousel for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const carouselOutput = db.prepare(`
      SELECT id, project_id, template_id, slides, created_at, updated_at
      FROM carousel_outputs
      WHERE project_id = ?
    `).get(project_id) as CarouselOutputRow | undefined

    if (!carouselOutput) {
      return NextResponse.json({ error: 'No carousel found' }, { status: 404 })
    }

    return NextResponse.json({
      ...carouselOutput,
      slides: JSON.parse(carouselOutput.slides)
    })

  } catch (error) {
    console.error('Error fetching carousel:', error)
    return NextResponse.json(
      { error: 'Failed to fetch carousel' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/carousel/generate
 * Update carousel slides (reorder, edit text, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { carousel_id, slides } = body

    if (!carousel_id) {
      return NextResponse.json({ error: 'carousel_id is required' }, { status: 400 })
    }

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 })
    }

    const existing = db.prepare(`
      SELECT id FROM carousel_outputs WHERE id = ?
    `).get(carousel_id) as { id: string } | undefined

    if (!existing) {
      return NextResponse.json({ error: 'Carousel not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    db.prepare(`
      UPDATE carousel_outputs
      SET slides = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(slides), now, carousel_id)

    const updated = db.prepare(`
      SELECT id, project_id, template_id, slides, created_at, updated_at
      FROM carousel_outputs
      WHERE id = ?
    `).get(carousel_id) as CarouselOutputRow

    return NextResponse.json({
      ...updated,
      slides: JSON.parse(updated.slides)
    })

  } catch (error) {
    console.error('Error updating carousel:', error)
    return NextResponse.json(
      { error: 'Failed to update carousel' },
      { status: 500 }
    )
  }
}
