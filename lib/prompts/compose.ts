import db from '@/lib/db'
import type { Platform, RegenerateSection, SettingKey } from '@/types'

// Short-lived cache for prompt settings (5 seconds)
let cachedSettings: Record<string, string> | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5000

function getSettings(): Record<string, string> {
  const now = Date.now()
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSettings
  }

  const stmt = db.prepare('SELECT key, value FROM settings')
  const rows = stmt.all() as { key: string; value: string }[]

  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }

  cachedSettings = settings
  cacheTimestamp = now
  return settings
}

export function invalidatePromptCache(): void {
  cachedSettings = null
  cacheTimestamp = 0
}

// Map regenerate section to setting key
const SECTION_TO_KEY: Record<RegenerateSection, SettingKey> = {
  hooks: 'hooks_agent_prompt',
  body: 'body_agent_prompt',
  intros: 'intros_agent_prompt',
  titles: 'titles_agent_prompt',
  ctas: 'ctas_agent_prompt',
  visuals: 'thumbnails_agent_prompt',
}

/**
 * Composes a layered system prompt:
 *   baseSystemPrompt + master_voice + platform_tone + section_agent
 */
export function composeSystemPrompt(
  baseSystemPrompt: string,
  platform?: Platform,
  section?: RegenerateSection
): string {
  const settings = getSettings()

  let composed = baseSystemPrompt

  // Layer 1: Master voice & style
  const masterVoice = settings['master_voice_prompt']
  if (masterVoice?.trim()) {
    composed += `\n\n--- Voice & Style ---\n${masterVoice}`
  }

  // Layer 2: Platform tone modifier
  if (platform) {
    const toneKey = `${platform}_tone_prompt`
    const platformTone = settings[toneKey]
    if (platformTone?.trim()) {
      composed += `\n\n--- Platform Tone ---\n${platformTone}`
    }
  }

  // Layer 3: Section agent prompt
  if (section) {
    const sectionKey = SECTION_TO_KEY[section]
    if (sectionKey) {
      const sectionPrompt = settings[sectionKey]
      if (sectionPrompt?.trim()) {
        composed += `\n\n--- Section Expert ---\n${sectionPrompt}`
      }
    }
  }

  return composed
}
