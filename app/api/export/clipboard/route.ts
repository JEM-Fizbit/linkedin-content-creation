import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Session } from '@/types'

interface DbOutput {
  id: string
  session_id: string
  hooks: string
  body_content: string
  ctas: string
}

// POST /api/export/clipboard - Get formatted content for LinkedIn clipboard copy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, hook_index = 0, cta_index = 0 } = body as {
      session_id: string
      hook_index?: number
      cta_index?: number
    }

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    // Verify session exists
    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
    const session = sessionStmt.get(session_id) as Session | undefined

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get output
    const outputStmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
    const dbOutput = outputStmt.get(session_id) as DbOutput | undefined

    if (!dbOutput) {
      return NextResponse.json(
        { error: 'No content to export. Please generate content first.' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const hooks = JSON.parse(dbOutput.hooks) as string[]
    const ctas = JSON.parse(dbOutput.ctas) as string[]

    // Validate indices
    const selectedHookIndex = Math.min(Math.max(0, hook_index), hooks.length - 1)
    const selectedCtaIndex = Math.min(Math.max(0, cta_index), ctas.length - 1)

    // Get selected content
    const hook = hooks[selectedHookIndex] || ''
    const bodyContent = dbOutput.body_content || ''
    const cta = ctas[selectedCtaIndex] || ''

    // Format content for LinkedIn:
    // Hook at the top, then body, then CTA at the bottom
    // LinkedIn prefers short paragraphs with line breaks
    const formattedContent = `${hook}

${bodyContent}

${cta}`

    return NextResponse.json({
      content: formattedContent,
      selected: {
        hook_index: selectedHookIndex,
        cta_index: selectedCtaIndex,
      },
      metadata: {
        session_id: session.id,
        title: session.title,
        word_count: formattedContent.split(/\s+/).filter(w => w).length,
        character_count: formattedContent.length,
      }
    })
  } catch (error) {
    console.error('Error exporting clipboard content:', error)
    return NextResponse.json(
      { error: 'Failed to export content' },
      { status: 500 }
    )
  }
}
