import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Setting, SettingKey } from '@/types'

// GET /api/settings - Get all settings or specific setting by key
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key') as SettingKey | null

    if (key) {
      const stmt = db.prepare('SELECT * FROM settings WHERE key = ?')
      const setting = stmt.get(key) as Setting | undefined

      if (!setting) {
        return NextResponse.json(
          { error: 'Setting not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(setting)
    }

    const stmt = db.prepare('SELECT * FROM settings ORDER BY key')
    const settings = stmt.all() as Setting[]

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings - Update a setting value
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body as { key: SettingKey; value: string }

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'key and value are required' },
        { status: 400 }
      )
    }

    // Validate that the setting exists
    const checkStmt = db.prepare('SELECT id FROM settings WHERE key = ?')
    const exists = checkStmt.get(key)

    if (!exists) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()
    const updateStmt = db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
    updateStmt.run(value, now, key)

    const getStmt = db.prepare('SELECT * FROM settings WHERE key = ?')
    const updatedSetting = getStmt.get(key) as Setting

    return NextResponse.json(updatedSetting)
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    )
  }
}

// POST /api/settings/reset - Reset a setting to default value
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key } = body as { key: SettingKey }

    if (!key) {
      return NextResponse.json(
        { error: 'key is required' },
        { status: 400 }
      )
    }

    // Default prompts (same as in db/index.ts)
    const defaultPrompts: Record<SettingKey, string> = {
      hooks_agent_prompt: `You are an expert content hook writer specializing in attention-grabbing opening lines.
Your hooks should:
- Stop the scroll immediately
- Create curiosity or emotional connection
- Be concise (1-2 sentences max)
- Avoid clickbait - deliver real value
- Match the tone specified by the user`,
      body_agent_prompt: `You are an expert content body writer focused on engaging, valuable content.
Your body content should:
- Be 150-300 words for optimal engagement
- Use short paragraphs (1-2 sentences) for mobile readability
- Include specific details, numbers, and examples
- Flow logically from hook to conclusion
- Deliver genuine value to the reader`,
      intros_agent_prompt: `You are an expert video intro writer for YouTube content.
Your intros should:
- Hook viewers in the first 5-10 seconds
- Clearly state what the video will cover
- Create anticipation for the content
- Match the creator's style and tone
- Be concise but compelling`,
      titles_agent_prompt: `You are an expert title writer for content optimization.
Your titles should:
- Be compelling and clickable
- Include relevant keywords naturally
- Create curiosity without being clickbait
- Be appropriate length for the platform
- Accurately represent the content`,
      ctas_agent_prompt: `You are an expert call-to-action writer.
Your CTAs should:
- Be clear and actionable
- Create urgency or motivation
- Match the content's tone
- Drive meaningful engagement
- Feel natural, not pushy`,
      thumbnails_agent_prompt: `You are an expert thumbnail concept designer.
Your thumbnail concepts should:
- Be visually striking and eye-catching
- Communicate the content's value at a glance
- Use bold colors and clear text
- Feature the creator when appropriate
- Stand out in a crowded feed`,
    }

    const defaultValue = defaultPrompts[key]
    if (!defaultValue) {
      return NextResponse.json(
        { error: 'Unknown setting key' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const updateStmt = db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
    updateStmt.run(defaultValue, now, key)

    const getStmt = db.prepare('SELECT * FROM settings WHERE key = ?')
    const updatedSetting = getStmt.get(key) as Setting

    return NextResponse.json(updatedSetting)
  } catch (error) {
    console.error('Error resetting setting:', error)
    return NextResponse.json(
      { error: 'Failed to reset setting' },
      { status: 500 }
    )
  }
}
