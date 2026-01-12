import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { Output, Message } from '@/types'

// POST /api/outputs - Generate structured output for a session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    // Verify session exists
    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
    const session = sessionStmt.get(session_id) as { id: string; original_idea: string } | undefined

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get conversation history for context
    const messagesStmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    const messages = messagesStmt.all(session_id) as Message[]

    // Check if output already exists
    const existingOutputStmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
    const existingOutput = existingOutputStmt.get(session_id) as Output | undefined

    // Generate structured content based on conversation
    const generatedContent = generateStructuredContent(session.original_idea, messages)

    const now = new Date().toISOString()

    if (existingOutput) {
      // Update existing output
      const updateStmt = db.prepare(`
        UPDATE outputs
        SET hooks = ?, body_content = ?, ctas = ?, visual_concepts = ?, updated_at = ?
        WHERE session_id = ?
      `)
      updateStmt.run(
        JSON.stringify(generatedContent.hooks),
        generatedContent.body_content,
        JSON.stringify(generatedContent.ctas),
        JSON.stringify(generatedContent.visual_concepts),
        now,
        session_id
      )

      const output: Output = {
        ...existingOutput,
        hooks: generatedContent.hooks,
        body_content: generatedContent.body_content,
        ctas: generatedContent.ctas,
        visual_concepts: generatedContent.visual_concepts,
        updated_at: now,
      }

      return NextResponse.json({ output })
    } else {
      // Create new output
      const outputId = generateId()

      const insertStmt = db.prepare(`
        INSERT INTO outputs (id, session_id, hooks, hooks_original, body_content, body_content_original, ctas, ctas_original, visual_concepts, visual_concepts_original, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      insertStmt.run(
        outputId,
        session_id,
        JSON.stringify(generatedContent.hooks),
        JSON.stringify(generatedContent.hooks),
        generatedContent.body_content,
        generatedContent.body_content,
        JSON.stringify(generatedContent.ctas),
        JSON.stringify(generatedContent.ctas),
        JSON.stringify(generatedContent.visual_concepts),
        JSON.stringify(generatedContent.visual_concepts),
        now,
        now
      )

      const output: Output = {
        id: outputId,
        session_id,
        hooks: generatedContent.hooks,
        hooks_original: generatedContent.hooks,
        body_content: generatedContent.body_content,
        body_content_original: generatedContent.body_content,
        ctas: generatedContent.ctas,
        ctas_original: generatedContent.ctas,
        visual_concepts: generatedContent.visual_concepts,
        visual_concepts_original: generatedContent.visual_concepts,
        created_at: now,
        updated_at: now,
      }

      return NextResponse.json({ output })
    }
  } catch (error) {
    console.error('Error generating output:', error)
    return NextResponse.json(
      { error: 'Failed to generate output' },
      { status: 500 }
    )
  }
}

// Helper function to generate structured content
// In production, this would call Claude SDK
function generateStructuredContent(originalIdea: string, messages: Message[]) {
  // Extract key themes from the original idea
  const ideaLower = originalIdea.toLowerCase()

  let topic = 'professional growth'
  if (ideaLower.includes('ai') || ideaLower.includes('artificial intelligence')) {
    topic = 'AI and technology'
  } else if (ideaLower.includes('leadership') || ideaLower.includes('leader')) {
    topic = 'leadership'
  } else if (ideaLower.includes('career') || ideaLower.includes('job')) {
    topic = 'career development'
  } else if (ideaLower.includes('remote') || ideaLower.includes('work from home')) {
    topic = 'remote work'
  } else if (ideaLower.includes('startup') || ideaLower.includes('entrepreneur')) {
    topic = 'entrepreneurship'
  }

  const hooks = [
    `I made a decision 6 months ago that changed everything about how I approach ${topic}. Here's what happened...`,
    `Everyone's talking about ${topic}. But here's what most people are getting completely wrong...`,
    `What if I told you the biggest myth about ${topic} is costing you opportunities every single day?`
  ]

  const body_content = `Six months ago, I found myself at a crossroads with ${topic}.

Like many professionals, I thought I had it figured out. I was doing what everyone else was doing, following the "best practices" that filled my LinkedIn feed.

But something wasn't working.

That's when I decided to take a different approach. Instead of following the crowd, I started questioning the assumptions I'd been operating under.

Here's what I discovered:

The conventional wisdom about ${topic} is often based on outdated thinking. What worked five years ago doesn't necessarily work today.

The professionals who are thriving aren't just working harder - they're thinking differently about the fundamentals.

Three key shifts made all the difference:

1. Embracing experimentation over perfection
2. Building genuine connections instead of transactional relationships
3. Focusing on impact rather than activity

The results? More meaningful work, better opportunities, and a renewed sense of purpose.

If you're feeling stuck in your approach to ${topic}, maybe it's time to question your assumptions too.`

  const ctas = [
    `What's one assumption about ${topic} you've started questioning lately? I'd love to hear your thoughts in the comments.`,
    `If this resonated with you, give it a like and follow me for more insights on ${topic}. I share practical tips every week.`,
    `Agree? Disagree? Either way, I want to hear your perspective. Drop a comment below - I read and respond to every single one.`
  ]

  const visual_concepts = [
    {
      description: `A minimalist split-screen graphic showing "Then vs Now" - the left side showing traditional ${topic} approaches in muted colors, the right side showing modern approaches in vibrant colors`,
      preview_data: undefined
    },
    {
      description: `A clean carousel design with 5 slides: Title slide with hook, 3 key insight slides with icons, and a CTA slide with your profile photo`,
      preview_data: undefined
    },
    {
      description: `An infographic showing the "3 Mindset Shifts" as a visual journey/path, with before/after states at each stage`,
      preview_data: undefined
    }
  ]

  return {
    hooks,
    body_content,
    ctas,
    visual_concepts
  }
}
