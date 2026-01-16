import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId, safeJsonParse } from '@/lib/utils'
import anthropic, { SYSTEM_PROMPT, isConfigured } from '@/lib/claude'
import { UI_MANIPULATION_TOOLS, ASSISTANT_SYSTEM_PROMPT, parseToolCalls } from '@/lib/claude/tools'
import type { Message, Project, Output, AssistantAction, AssistantResponse, ContentType, VisualConcept, Platform } from '@/types'

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

    // Add context about the project
    conversationHistory.push({
      role: 'user',
      content: `Project context:
- Platform: ${project.platform}
- Topic: ${project.topic}
- Target audience: ${project.target_audience || 'Not specified'}
- Content style: ${project.content_style || 'Not specified'}
- Current step: ${project.current_step}

Current content:
${output ? formatCurrentContent(output) : 'No content generated yet.'}

User message: ${message}`
    })

    // Add existing conversation
    for (const msg of existingMessages.slice(-10)) { // Last 10 messages for context
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

    // Call Claude API with tools
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\n${ASSISTANT_SYSTEM_PROMPT}`,
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

    // Parse tool calls into actions
    const actions = parseToolCalls(toolCalls)

    // Execute actions on the database
    if (actions.length > 0 && output) {
      await executeActions(project_id, output, actions)
    }

    // Save assistant message
    const assistantMessageId = generateId()
    const assistantNow = new Date().toISOString()

    const insertAssistantMsg = db.prepare(`
      INSERT INTO messages (id, project_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, ?)
    `)
    insertAssistantMsg.run(assistantMessageId, project_id, assistantMessage, assistantNow)

    // Get updated output if actions were taken
    let updatedOutput: Output | undefined
    if (actions.length > 0) {
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

// Execute actions on the database
async function executeActions(projectId: string, output: DbOutput, actions: AssistantAction[]) {
  for (const action of actions) {
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
