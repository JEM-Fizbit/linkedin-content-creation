import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import anthropic, { SYSTEM_PROMPT, SECTION_PROMPTS, isConfigured } from '@/lib/claude'
import { composeSystemPrompt } from '@/lib/prompts/compose'
import type { Output, Message, VisualConcept, Project, Session, Platform, RegenerateSection } from '@/types'
import { safeJsonParse } from '@/lib/utils'

interface DbOutput {
  id: string
  session_id?: string
  project_id?: string
  hooks: string
  hooks_original: string
  body_content: string
  body_content_original: string
  intros: string
  intros_original: string
  titles: string
  titles_original: string
  ctas: string
  ctas_original: string
  visual_concepts: string
  visual_concepts_original: string
  selected_hook_index: number
  selected_body_index: number
  selected_intro_index: number
  selected_title_index: number
  selected_cta_index: number
  selected_visual_index: number
  created_at: string
  updated_at: string
}

// Extended section prompts for new content types
const EXTENDED_SECTION_PROMPTS: Record<RegenerateSection, string> = {
  hooks: SECTION_PROMPTS.hooks,
  body: SECTION_PROMPTS.body,
  ctas: SECTION_PROMPTS.ctas,
  visuals: SECTION_PROMPTS.visuals,
  intros: `Generate 3 compelling video intro scripts (30-60 seconds each). Each intro should:
- Hook viewers in the first 5 seconds
- Clearly state what the video will cover
- Create anticipation for the content
- Match the creator's style and tone
Return as a JSON array of strings.`,
  titles: `Generate 5 SEO-optimized video title options. Each title should:
- Be under 60 characters
- Include relevant keywords naturally
- Create curiosity without being clickbait
- Accurately represent the content
Return as a JSON array of strings.`,
}

// POST /api/regenerate - Regenerate a specific section of the output
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, project_id, section, append = false } = body as {
      session_id?: string
      project_id?: string
      section: RegenerateSection
      append?: boolean // If true, append new content to existing instead of replacing
    }

    if (!session_id && !project_id) {
      return NextResponse.json(
        { error: 'Either session_id or project_id is required' },
        { status: 400 }
      )
    }

    const validSections: RegenerateSection[] = ['hooks', 'body', 'intros', 'titles', 'ctas', 'visuals']
    if (!section || !validSections.includes(section)) {
      return NextResponse.json(
        { error: 'Valid section is required (hooks, body, intros, titles, ctas, or visuals)' },
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

    let contextInfo: { topic: string; platform: Platform; targetAudience?: string; contentStyle?: string } | null = null
    let messages: Message[] = []
    let existingOutput: DbOutput | undefined

    // Handle project-based regeneration (new)
    if (project_id) {
      const projectStmt = db.prepare('SELECT * FROM projects WHERE id = ?')
      const project = projectStmt.get(project_id) as Project | undefined

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }

      contextInfo = {
        topic: project.topic,
        platform: project.platform,
        targetAudience: project.target_audience,
        contentStyle: project.content_style,
      }

      const outputStmt = db.prepare('SELECT * FROM outputs WHERE project_id = ?')
      existingOutput = outputStmt.get(project_id) as DbOutput | undefined

      const messagesStmt = db.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC')
      messages = messagesStmt.all(project_id) as Message[]
    }
    // Handle session-based regeneration (legacy)
    else if (session_id) {
      const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
      const session = sessionStmt.get(session_id) as Session | undefined

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      contextInfo = {
        topic: session.original_idea,
        platform: 'linkedin',
      }

      const outputStmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
      existingOutput = outputStmt.get(session_id) as DbOutput | undefined

      const messagesStmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
      messages = messagesStmt.all(session_id) as Message[]
    }

    if (!existingOutput) {
      return NextResponse.json(
        { error: 'Output not found. Please generate content first.' },
        { status: 404 }
      )
    }

    if (!contextInfo) {
      return NextResponse.json(
        { error: 'Unable to load context' },
        { status: 500 }
      )
    }

    // Generate new content for the specific section using Claude
    const regeneratedContent = await regenerateSection(section, contextInfo, messages, project_id, append ? 2 : undefined)

    const now = new Date().toISOString()
    const idColumn = project_id ? 'project_id' : 'session_id'
    const idValue = project_id || session_id

    // Map section to database column
    const sectionToColumn: Record<RegenerateSection, string> = {
      hooks: 'hooks',
      body: 'body_content',
      intros: 'intros',
      titles: 'titles',
      ctas: 'ctas',
      visuals: 'visual_concepts',
    }

    const column = sectionToColumn[section]
    let value: string

    if (append && section !== 'body') {
      // Append new content to existing
      const existingContent = safeJsonParse(existingOutput[column as keyof DbOutput] as string, [])
      const newContent = [...existingContent, ...(regeneratedContent as unknown[])]
      value = JSON.stringify(newContent)
    } else {
      value = section === 'body' ? regeneratedContent as string : JSON.stringify(regeneratedContent)
    }

    const updateStmt = db.prepare(`UPDATE outputs SET ${column} = ?, updated_at = ? WHERE ${idColumn} = ?`)
    updateStmt.run(value, now, idValue)

    // Fetch updated output
    const outputStmt = db.prepare(`SELECT * FROM outputs WHERE ${idColumn} = ?`)
    const updatedDbOutput = outputStmt.get(idValue) as DbOutput

    const output: Output = {
      id: updatedDbOutput.id,
      session_id: updatedDbOutput.session_id,
      project_id: updatedDbOutput.project_id,
      hooks: safeJsonParse(updatedDbOutput.hooks, []),
      hooks_original: safeJsonParse(updatedDbOutput.hooks_original, []),
      selected_hook_index: updatedDbOutput.selected_hook_index ?? -1,
      body_content: updatedDbOutput.body_content,
      body_content_original: updatedDbOutput.body_content_original,
      selected_body_index: updatedDbOutput.selected_body_index ?? -1,
      intros: safeJsonParse(updatedDbOutput.intros, []),
      intros_original: safeJsonParse(updatedDbOutput.intros_original, []),
      selected_intro_index: updatedDbOutput.selected_intro_index ?? -1,
      titles: safeJsonParse(updatedDbOutput.titles, []),
      titles_original: safeJsonParse(updatedDbOutput.titles_original, []),
      selected_title_index: updatedDbOutput.selected_title_index ?? -1,
      ctas: safeJsonParse(updatedDbOutput.ctas, []),
      ctas_original: safeJsonParse(updatedDbOutput.ctas_original, []),
      selected_cta_index: updatedDbOutput.selected_cta_index ?? -1,
      visual_concepts: safeJsonParse(updatedDbOutput.visual_concepts, []),
      visual_concepts_original: safeJsonParse(updatedDbOutput.visual_concepts_original, []),
      selected_visual_index: updatedDbOutput.selected_visual_index ?? -1,
      created_at: updatedDbOutput.created_at,
      updated_at: updatedDbOutput.updated_at,
    }

    return NextResponse.json({ output, regenerated_section: section })
  } catch (error) {
    console.error('Error regenerating section:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate section' },
      { status: 500 }
    )
  }
}

// Regenerate a specific section using Claude API
async function regenerateSection(
  section: RegenerateSection,
  contextInfo: { topic: string; platform: Platform; targetAudience?: string; contentStyle?: string },
  messages: Message[],
  projectId?: string,
  count?: number // Optional count for generating fewer items (used in append mode)
): Promise<string[] | string | VisualConcept[]> {
  // Build conversation context
  const conversationContext = messages.map(m => `${m.role}: ${m.content}`).join('\n\n')

  // Build context description
  let contextDesc = `Topic: "${contextInfo.topic}"`
  if (contextInfo.targetAudience) {
    contextDesc += `\nTarget audience: ${contextInfo.targetAudience}`
  }
  if (contextInfo.contentStyle) {
    contextDesc += `\nContent style/tone: ${contextInfo.contentStyle}`
  }
  contextDesc += `\nPlatform: ${contextInfo.platform}`

  // Add uploaded text sources if available
  if (projectId) {
    try {
      const sourcesStmt = db.prepare(
        'SELECT title, content FROM project_sources WHERE project_id = ? AND enabled = 1 ORDER BY created_at ASC'
      )
      const sources = sourcesStmt.all(projectId) as { title: string; content: string }[]

      if (sources.length > 0) {
        let totalChars = 0
        const MAX_CHARS = 8000
        contextDesc += '\n\n--- Reference Materials ---\n'
        contextDesc += 'Use these sources to inform your content:\n\n'
        for (const source of sources) {
          const available = MAX_CHARS - totalChars
          if (available <= 0) break
          const content = source.content.length > available
            ? source.content.substring(0, available) + '...[truncated]'
            : source.content
          contextDesc += `### ${source.title}\n${content}\n\n`
          totalChars += content.length
        }
      }

      if (section === 'visuals') {
        const assetsStmt = db.prepare(
          'SELECT type, filename FROM project_assets WHERE project_id = ?'
        )
        const assets = assetsStmt.all(projectId) as { type: string; filename: string }[]
        if (assets.length > 0) {
          contextDesc += '\n\n--- Visual References ---\n'
          contextDesc += 'Reference images provided: '
          contextDesc += assets.map(a => `${a.filename} (${a.type.replace('_', ' ')})`).join(', ')
          contextDesc += '\nUse their style/branding in visual concept descriptions.\n'
        }
      }
    } catch (err) {
      console.error('Failed to load project sources:', err)
    }
  }

  let sectionPrompt = EXTENDED_SECTION_PROMPTS[section]

  // If count is specified, modify the prompt to generate fewer items
  if (count && section !== 'body') {
    sectionPrompt = sectionPrompt.replace(/\d+ /g, (match) => {
      const num = parseInt(match)
      if (num > 2) return `${count} `
      return match
    })
  }

  const prompt = `${contextDesc}

Conversation history:
${conversationContext || 'No conversation yet.'}

Task: ${sectionPrompt}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: composeSystemPrompt(SYSTEM_PROMPT, contextInfo.platform, section),
    messages: [{ role: 'user', content: prompt }]
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

  // For body content, return as string
  if (section === 'body') {
    // Clean up any markdown code blocks
    let text = responseText.trim()
    if (text.startsWith('```')) {
      const lines = text.split('\n')
      lines.shift() // Remove first line (```)
      if (lines[lines.length - 1] === '```') {
        lines.pop()
      }
      text = lines.join('\n')
    }
    return text
  }

  // For other sections, parse as JSON
  try {
    let jsonStr = responseText.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    return JSON.parse(jsonStr)
  } catch {
    console.error('Failed to parse Claude response as JSON:', responseText)

    // Return fallback based on section type
    switch (section) {
      case 'hooks':
        return [
          'Here\'s something that might surprise you about this topic...',
          'I used to think this was complicated. Then I learned this...',
          'What if everything you knew about this was wrong?'
        ]
      case 'intros':
        return [
          'Hey everyone! Welcome back to the channel. Today we\'re diving into something exciting...',
          'What\'s up! If you\'re new here, hit that subscribe button because this one\'s going to be good...',
          'Before we get started, I want to share something that completely changed my perspective...'
        ]
      case 'titles':
        return [
          'This Changed Everything (You Need To See This)',
          'The Secret Most People Don\'t Know',
          'I Tested This For 30 Days - Here\'s What Happened',
          'Why Nobody Talks About This',
          'The Truth About This Topic'
        ]
      case 'ctas':
        return [
          'What\'s your experience with this? Share below.',
          'Follow for more insights like this.',
          'Tag someone who needs to see this.'
        ]
      case 'visuals':
        return [
          { description: 'A clean infographic summarizing the key points' },
          { description: 'A quote card featuring the main insight' },
          { description: 'A carousel walking through the main ideas' }
        ]
      default:
        return []
    }
  }
}
