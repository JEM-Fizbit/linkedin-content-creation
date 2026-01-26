import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import anthropic, { SYSTEM_PROMPT, isConfigured } from '@/lib/claude'
import { composeSystemPrompt } from '@/lib/prompts/compose'
import type { Message, Project, Session, Platform } from '@/types'

// POST /api/chat - Send message to Claude, receive response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, project_id, message } = body

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    if (!session_id && !project_id) {
      return NextResponse.json(
        { error: 'Either session_id or project_id is required' },
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
    let existingMessages: Message[] = []

    // Handle project-based chat (new)
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

      const messagesStmt = db.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC')
      existingMessages = messagesStmt.all(project_id) as Message[]
    }
    // Handle session-based chat (legacy)
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
        platform: 'linkedin', // Default for legacy sessions
      }

      const messagesStmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
      existingMessages = messagesStmt.all(session_id) as Message[]
    }

    if (!contextInfo) {
      return NextResponse.json(
        { error: 'Unable to load context' },
        { status: 500 }
      )
    }

    // Save user message
    const userMessageId = generateId()
    const now = new Date().toISOString()

    if (project_id) {
      const insertUserMsg = db.prepare(`
        INSERT INTO messages (id, project_id, role, content, created_at)
        VALUES (?, ?, 'user', ?, ?)
      `)
      insertUserMsg.run(userMessageId, project_id, message, now)
    } else {
      const insertUserMsg = db.prepare(`
        INSERT INTO messages (id, session_id, role, content, created_at)
        VALUES (?, ?, 'user', ?, ?)
      `)
      insertUserMsg.run(userMessageId, session_id, message, now)
    }

    const userMessage: Message = {
      id: userMessageId,
      session_id: session_id || undefined,
      project_id: project_id || undefined,
      role: 'user',
      content: message,
      created_at: now,
    }

    // Build conversation history for Claude
    const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []

    // Build context message based on project/session info
    let contextMessage = `I want to create content for ${contextInfo.platform} about this topic: "${contextInfo.topic}"`
    if (contextInfo.targetAudience) {
      contextMessage += `\n\nTarget audience: ${contextInfo.targetAudience}`
    }
    if (contextInfo.contentStyle) {
      contextMessage += `\n\nContent style/tone: ${contextInfo.contentStyle}`
    }

    // Add uploaded text sources to context
    if (project_id) {
      try {
        const sourcesStmt = db.prepare(
          'SELECT title, content FROM project_sources WHERE project_id = ? AND enabled = 1 ORDER BY created_at ASC'
        )
        const sources = sourcesStmt.all(project_id) as { title: string; content: string }[]
        if (sources.length > 0) {
          let totalChars = 0
          const MAX_CHARS = 6000
          contextMessage += '\n\n--- Reference Materials ---\n'
          for (const source of sources) {
            const available = MAX_CHARS - totalChars
            if (available <= 0) break
            const content = source.content.length > available
              ? source.content.substring(0, available) + '...[truncated]'
              : source.content
            contextMessage += `### ${source.title}\n${content}\n\n`
            totalChars += content.length
          }
        }
      } catch (err) {
        console.error('Failed to load project sources for chat:', err)
      }
    }

    // Add context about the topic as the first message
    if (existingMessages.length === 0) {
      conversationHistory.push({
        role: 'user',
        content: `${contextMessage}\n\n${message}`
      })
    } else {
      // Add original context
      conversationHistory.push({
        role: 'user',
        content: contextMessage
      })

      // Add existing conversation
      for (const msg of existingMessages) {
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
    }

    // Compose system prompt with voice, platform tone layers
    const enhancedSystemPrompt = composeSystemPrompt(SYSTEM_PROMPT, contextInfo.platform)

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: enhancedSystemPrompt,
      messages: conversationHistory
    })

    // Extract assistant response
    const assistantContent = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, but I was unable to generate a response.'

    // Save assistant message
    const assistantMessageId = generateId()
    const assistantNow = new Date().toISOString()

    if (project_id) {
      const insertAssistantMsg = db.prepare(`
        INSERT INTO messages (id, project_id, role, content, created_at)
        VALUES (?, ?, 'assistant', ?, ?)
      `)
      insertAssistantMsg.run(assistantMessageId, project_id, assistantContent, assistantNow)
    } else {
      const insertAssistantMsg = db.prepare(`
        INSERT INTO messages (id, session_id, role, content, created_at)
        VALUES (?, ?, 'assistant', ?, ?)
      `)
      insertAssistantMsg.run(assistantMessageId, session_id, assistantContent, assistantNow)
    }

    const assistantMessage: Message = {
      id: assistantMessageId,
      session_id: session_id || undefined,
      project_id: project_id || undefined,
      role: 'assistant',
      content: assistantContent,
      created_at: assistantNow,
    }

    return NextResponse.json({
      userMessage,
      assistantMessage,
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
