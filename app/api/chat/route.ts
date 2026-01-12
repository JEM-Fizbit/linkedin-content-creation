import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { Message } from '@/types'

// LinkedIn strategist persona system prompt
const SYSTEM_PROMPT = `You are an expert LinkedIn content strategist and copywriter with deep knowledge of:
- LinkedIn algorithm and best practices for engagement
- Hook writing that stops the scroll
- Storytelling techniques for professional content
- CTA strategies that drive meaningful actions
- Visual content that complements text posts
- Personal branding for professionals

Your tone is professional yet approachable, insightful, and focused on practical results.

When helping users:
1. Ask clarifying questions about their target audience, desired tone, and key takeaway if needed
2. Be a collaborative partner, not just a content generator
3. Provide specific, actionable suggestions
4. Consider the user's original idea and help refine it

When generating content:
- Hooks should be attention-grabbing and stop the scroll
- Body content should be 150-300 words, using short paragraphs for mobile readability
- CTAs should be clear and encourage meaningful engagement
- Visual concepts should complement and enhance the text content`

// POST /api/chat - Send message to Claude, receive response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, message } = body

    if (!session_id || !message) {
      return NextResponse.json(
        { error: 'session_id and message are required' },
        { status: 400 }
      )
    }

    // Verify session exists
    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
    const session = sessionStmt.get(session_id)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get existing messages for context
    const messagesStmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    const existingMessages = messagesStmt.all(session_id) as Message[]

    // Save user message
    const userMessageId = generateId()
    const now = new Date().toISOString()

    const insertUserMsg = db.prepare(`
      INSERT INTO messages (id, session_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `)
    insertUserMsg.run(userMessageId, session_id, message, now)

    const userMessage: Message = {
      id: userMessageId,
      session_id,
      role: 'user',
      content: message,
      created_at: now,
    }

    // For now, generate a placeholder response
    // In production, this would call the Claude SDK
    const assistantContent = generateAssistantResponse(message, existingMessages)

    // Save assistant message
    const assistantMessageId = generateId()
    const assistantNow = new Date().toISOString()

    const insertAssistantMsg = db.prepare(`
      INSERT INTO messages (id, session_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, ?)
    `)
    insertAssistantMsg.run(assistantMessageId, session_id, assistantContent, assistantNow)

    const assistantMessage: Message = {
      id: assistantMessageId,
      session_id,
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

// Placeholder response generator
// In production, this would be replaced with actual Claude SDK integration
function generateAssistantResponse(userMessage: string, existingMessages: Message[]): string {
  const isFirstMessage = existingMessages.length === 0

  if (isFirstMessage) {
    return `Great post idea! I'd love to help you craft engaging LinkedIn content around this topic.

Before we dive in, let me ask a few questions to make sure we create the perfect post:

1. **Who is your target audience?** (e.g., entrepreneurs, marketers, developers, career changers)

2. **What's the main takeaway** you want readers to remember?

3. **What tone do you prefer?** (e.g., professional, conversational, inspirational, educational)

Once I understand these details, I'll help you create:
- 3 attention-grabbing hooks
- A compelling body (150-300 words)
- 3 call-to-action options
- Visual concept ideas

Feel free to answer any or all of these questions, or if you'd like, I can suggest some options based on your initial idea!`
  }

  // For follow-up messages, provide contextual responses
  const lowerMessage = userMessage.toLowerCase()

  if (lowerMessage.includes('hook') || lowerMessage.includes('start')) {
    return `Here are 3 hook options for your post:

**Hook 1 (Story-based):**
"Last week, something happened that completely changed how I think about this..."

**Hook 2 (Contrarian):**
"Everyone says X, but here's why that advice might be holding you back..."

**Hook 3 (Question):**
"What if I told you the biggest mistake in [your field] is something we all do daily?"

Which style resonates most with your audience? I can refine any of these or create variations.`
  }

  if (lowerMessage.includes('cta') || lowerMessage.includes('call to action')) {
    return `Here are 3 CTA options for your post:

**CTA 1 (Engagement):**
"What's your experience with this? Drop a comment below - I read every single one."

**CTA 2 (Value-add):**
"If this resonated, follow me for more insights on [topic]. I share practical tips every week."

**CTA 3 (Discussion):**
"Do you agree or disagree? I'd love to hear a different perspective."

CTAs that ask questions typically get 2-3x more comments than statements. Would you like me to customize any of these?`
  }

  return `Thanks for sharing that! Based on what you've told me, here are my thoughts:

Your post has strong potential. To make it even more engaging, consider:

1. **Lead with emotion or curiosity** - What made this experience memorable for you?

2. **Use specific details** - Numbers, names, and concrete examples make content more believable

3. **Break up the text** - Short paragraphs (1-2 sentences) perform better on mobile

Would you like me to:
- Generate specific hooks for this topic?
- Help structure the body content?
- Suggest some CTA options?

Just let me know what would be most helpful!`
}
