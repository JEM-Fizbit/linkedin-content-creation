import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Session } from '@/types'

interface DbOutput {
  id: string
  session_id: string
  hooks: string
  hooks_original: string
  body_content: string
  body_content_original: string
  ctas: string
  ctas_original: string
  visual_concepts: string
  visual_concepts_original: string
  created_at: string
  updated_at: string
}

interface VisualConcept {
  description: string
  preview_data?: string
}

// POST /api/export - Export session content as Markdown
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, format = 'markdown' } = body as { session_id: string; format?: string }

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
    const visuals = JSON.parse(dbOutput.visual_concepts) as VisualConcept[]

    // Generate Markdown content
    const markdown = generateMarkdown(session, hooks, dbOutput.body_content, ctas, visuals)

    // Return the markdown content with appropriate headers for download
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${sanitizeFilename(session.title)}.md"`,
      },
    })
  } catch (error) {
    console.error('Error exporting session:', error)
    return NextResponse.json(
      { error: 'Failed to export session' },
      { status: 500 }
    )
  }
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .toLowerCase()
}

function generateMarkdown(
  session: Session,
  hooks: string[],
  bodyContent: string,
  ctas: string[],
  visuals: VisualConcept[]
): string {
  const lines: string[] = []

  // Title
  lines.push(`# ${session.title}`)
  lines.push('')

  // Metadata
  lines.push('## Session Info')
  lines.push('')
  lines.push(`- **Original Idea:** ${session.original_idea}`)
  lines.push(`- **Status:** ${session.status}`)
  lines.push(`- **Created:** ${new Date(session.created_at).toLocaleDateString()}`)
  if (session.published_at) {
    lines.push(`- **Published:** ${new Date(session.published_at).toLocaleDateString()}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  // Hooks Section
  lines.push('## Hooks')
  lines.push('')
  lines.push('Choose one of the following attention-grabbing hooks:')
  lines.push('')
  hooks.forEach((hook, index) => {
    lines.push(`### Hook ${index + 1}`)
    lines.push('')
    lines.push(`> ${hook}`)
    lines.push('')
  })
  lines.push('---')
  lines.push('')

  // Body Content Section
  lines.push('## Body Content')
  lines.push('')
  lines.push(bodyContent)
  lines.push('')
  lines.push('---')
  lines.push('')

  // CTAs Section
  lines.push('## Call to Actions')
  lines.push('')
  lines.push('Choose one of the following CTAs to close your post:')
  lines.push('')
  ctas.forEach((cta, index) => {
    lines.push(`### CTA ${index + 1}`)
    lines.push('')
    lines.push(`> ${cta}`)
    lines.push('')
  })
  lines.push('---')
  lines.push('')

  // Visual Concepts Section
  lines.push('## Visual Concepts')
  lines.push('')
  lines.push('Consider these visual ideas to accompany your post:')
  lines.push('')
  visuals.forEach((visual, index) => {
    lines.push(`### Concept ${index + 1}`)
    lines.push('')
    lines.push(visual.description)
    lines.push('')
  })
  lines.push('---')
  lines.push('')

  // Footer
  lines.push('*Generated with LI-Creator*')

  return lines.join('\n')
}
