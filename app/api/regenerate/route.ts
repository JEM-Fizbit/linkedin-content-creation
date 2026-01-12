import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Output, Message } from '@/types'

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

type SectionType = 'hooks' | 'body' | 'ctas' | 'visuals'

// POST /api/regenerate - Regenerate a specific section of the output
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, section } = body as { session_id: string; section: SectionType }

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    if (!section || !['hooks', 'body', 'ctas', 'visuals'].includes(section)) {
      return NextResponse.json(
        { error: 'Valid section is required (hooks, body, ctas, or visuals)' },
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

    // Verify output exists
    const outputStmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
    const existingOutput = outputStmt.get(session_id) as DbOutput | undefined

    if (!existingOutput) {
      return NextResponse.json(
        { error: 'Output not found. Please generate content first.' },
        { status: 404 }
      )
    }

    // Get conversation history for context
    const messagesStmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    const messages = messagesStmt.all(session_id) as Message[]

    // Generate new content for the specific section
    const regeneratedContent = regenerateSection(section, session.original_idea, messages)

    const now = new Date().toISOString()
    let updateQuery = ''
    let updateValues: (string | null)[] = []

    // Update only the requested section
    switch (section) {
      case 'hooks':
        updateQuery = 'UPDATE outputs SET hooks = ?, updated_at = ? WHERE session_id = ?'
        updateValues = [JSON.stringify(regeneratedContent), now, session_id]
        break
      case 'body':
        updateQuery = 'UPDATE outputs SET body_content = ?, updated_at = ? WHERE session_id = ?'
        updateValues = [regeneratedContent as string, now, session_id]
        break
      case 'ctas':
        updateQuery = 'UPDATE outputs SET ctas = ?, updated_at = ? WHERE session_id = ?'
        updateValues = [JSON.stringify(regeneratedContent), now, session_id]
        break
      case 'visuals':
        updateQuery = 'UPDATE outputs SET visual_concepts = ?, updated_at = ? WHERE session_id = ?'
        updateValues = [JSON.stringify(regeneratedContent), now, session_id]
        break
    }

    const updateStmt = db.prepare(updateQuery)
    updateStmt.run(...updateValues)

    // Fetch updated output
    const updatedDbOutput = outputStmt.get(session_id) as DbOutput

    const output: Output = {
      id: updatedDbOutput.id,
      session_id: updatedDbOutput.session_id,
      hooks: JSON.parse(updatedDbOutput.hooks),
      hooks_original: JSON.parse(updatedDbOutput.hooks_original),
      body_content: updatedDbOutput.body_content,
      body_content_original: updatedDbOutput.body_content_original,
      ctas: JSON.parse(updatedDbOutput.ctas),
      ctas_original: JSON.parse(updatedDbOutput.ctas_original),
      visual_concepts: JSON.parse(updatedDbOutput.visual_concepts),
      visual_concepts_original: JSON.parse(updatedDbOutput.visual_concepts_original),
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

// Helper function to regenerate a specific section
// In production, this would call Claude SDK with section-specific prompts
function regenerateSection(section: SectionType, originalIdea: string, messages: Message[]) {
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

  // Generate randomized variations based on section
  const timestamp = Date.now()
  const variation = timestamp % 3 // Creates some variation

  switch (section) {
    case 'hooks':
      const hookVariations = [
        [
          `Here's the uncomfortable truth about ${topic} that nobody wants to hear...`,
          `I spent 5 years learning this lesson about ${topic}. Let me save you the time.`,
          `Stop doing this if you want to succeed in ${topic}. Here's why:`
        ],
        [
          `The #1 mistake I see people make with ${topic}? It's not what you think.`,
          `"That will never work." I heard this 100 times before proving everyone wrong about ${topic}.`,
          `3 years ago I almost gave up on ${topic}. Today I'm grateful I didn't. Here's what changed:`
        ],
        [
          `Hot take: Most advice about ${topic} is outdated. Here's what actually works in 2024.`,
          `I used to think success in ${topic} required working 80-hour weeks. I was wrong.`,
          `Want to know the secret to ${topic}? It's simpler than you think (but not easy):`
        ]
      ]
      return hookVariations[variation]

    case 'body':
      const bodyVariations = [
        `Let me tell you a story about ${topic}.

When I first started, I thought I knew everything. I had read all the books, followed all the "experts," and did everything by the book.

But something was missing.

It wasn't until I stopped trying to follow everyone else's playbook that things started to click.

Here's the truth: What works for someone else might not work for you. And that's okay.

The key insights I discovered:

1. Authenticity beats strategy every time
2. Consistency compounds over time
3. Relationships matter more than metrics

The journey wasn't easy. There were setbacks, doubts, and moments where I questioned everything.

But looking back, every challenge taught me something valuable about ${topic}.

If you're in the middle of your own journey, remember: The path isn't always clear, but that doesn't mean you're lost.

Sometimes the detours lead to the best destinations.`,
        `Let's talk about what really matters in ${topic}.

I've spent years studying this, making mistakes, and learning from them. Here's what I wish someone had told me from the start.

First, forget about perfection. It's the enemy of progress.

Second, embrace the uncertainty. Nobody has it all figured out, no matter how confident they seem on social media.

Third, invest in relationships. Your network isn't just about what others can do for you—it's about genuine connection.

The game-changers in ${topic}:

- Focus on value creation, not value extraction
- Play long-term games with long-term people
- Learn in public, share your journey

The most successful people I know in ${topic} aren't the smartest or most talented. They're the most adaptable.

They understand that what got them here won't get them there.

That's the real secret: Evolution, not perfection.`,
        `Here's my honest take on ${topic} after years of experience.

The industry loves to overcomplicate things. Courses, frameworks, and methodologies that promise shortcuts.

But here's what actually moves the needle:

Showing up. Day after day. Even when you don't feel like it.

That's it. That's the "hack."

Everything else—the tactics, the strategies, the tools—they're just amplifiers.

Without consistent effort, nothing works. With it, almost everything does.

Key principles I've learned about ${topic}:

1. Simple beats complex 9 times out of 10
2. Action creates clarity (not the other way around)
3. Your first attempt will probably suck (and that's fine)

The people crushing it in ${topic} aren't working on some secret formula. They're just not quitting.

When you play the long game, the odds shift dramatically in your favor.

Start simple. Stay consistent. Iterate endlessly.`
      ]
      return bodyVariations[variation]

    case 'ctas':
      const ctaVariations = [
        [
          `What's your biggest challenge with ${topic}? Drop it in the comments—I read every single one.`,
          `Found this helpful? Follow me for more insights on ${topic}. I post daily tips and lessons learned.`,
          `Tag someone who needs to see this. Sometimes the right message at the right time makes all the difference.`
        ],
        [
          `Agree or disagree? I'd love to hear your perspective on ${topic} in the comments below.`,
          `Save this post for later when you need a reminder. And follow for more content like this.`,
          `Share this with your team if it resonates. Let's start a conversation about ${topic}.`
        ],
        [
          `What would you add to this list? The best ideas often come from the comments section.`,
          `Hit follow if you want more real talk about ${topic}. No fluff, just practical insights.`,
          `Comment "YES" if you're committed to improving your ${topic} game this year.`
        ]
      ]
      return ctaVariations[variation]

    case 'visuals':
      const visualVariations = [
        [
          {
            description: `A bold quote graphic with the key insight about ${topic} - use a gradient background from blue to purple`,
            preview_data: undefined
          },
          {
            description: `A before/after comparison showing the transformation journey in ${topic}`,
            preview_data: undefined
          },
          {
            description: `A numbered list infographic highlighting the 3 main takeaways`,
            preview_data: undefined
          }
        ],
        [
          {
            description: `A professional headshot-style photo with a text overlay featuring the hook`,
            preview_data: undefined
          },
          {
            description: `A carousel post with 5-7 slides breaking down the key points`,
            preview_data: undefined
          },
          {
            description: `A simple but impactful one-liner quote card on a clean white background`,
            preview_data: undefined
          }
        ],
        [
          {
            description: `A statistics-focused graphic highlighting key numbers about ${topic}`,
            preview_data: undefined
          },
          {
            description: `A step-by-step visual guide showing the process or framework`,
            preview_data: undefined
          },
          {
            description: `A polaroid-style collage showing the journey and key moments`,
            preview_data: undefined
          }
        ]
      ]
      return visualVariations[variation]

    default:
      return null
  }
}
