import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'app.db')
const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Initialize schema
db.exec(`
  -- Projects table (expanded from sessions)
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    topic TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT '',
    content_style TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT 'linkedin' CHECK (platform IN ('linkedin', 'youtube', 'facebook')),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete', 'published')),
    current_step TEXT NOT NULL DEFAULT 'setup' CHECK (current_step IN ('setup', 'hooks', 'body', 'intros', 'titles', 'ctas', 'visuals', 'thumbnails', 'carousel', 'complete')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    remix_of_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL
  );

  -- Legacy sessions table (keep for backward compatibility during migration)
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    original_idea TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete', 'published')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    remix_of_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL
  );

  -- Messages table (works with both projects and sessions)
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (session_id IS NOT NULL OR project_id IS NOT NULL)
  );

  -- Outputs table (works with both projects and sessions)
  CREATE TABLE IF NOT EXISTS outputs (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    project_id TEXT UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    hooks TEXT NOT NULL DEFAULT '[]',
    hooks_original TEXT NOT NULL DEFAULT '[]',
    body_content TEXT NOT NULL DEFAULT '',
    body_content_original TEXT NOT NULL DEFAULT '',
    intros TEXT NOT NULL DEFAULT '[]',
    intros_original TEXT NOT NULL DEFAULT '[]',
    titles TEXT NOT NULL DEFAULT '[]',
    titles_original TEXT NOT NULL DEFAULT '[]',
    ctas TEXT NOT NULL DEFAULT '[]',
    ctas_original TEXT NOT NULL DEFAULT '[]',
    visual_concepts TEXT NOT NULL DEFAULT '[]',
    visual_concepts_original TEXT NOT NULL DEFAULT '[]',
    selected_hook_index INTEGER DEFAULT 0,
    selected_body_index INTEGER DEFAULT 0,
    selected_intro_index INTEGER DEFAULT 0,
    selected_title_index INTEGER DEFAULT 0,
    selected_cta_index INTEGER DEFAULT 0,
    selected_visual_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (session_id IS NOT NULL OR project_id IS NOT NULL)
  );

  -- Project assets table (uploaded reference images, logos, etc.)
  CREATE TABLE IF NOT EXISTS project_assets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('reference_image', 'logo', 'icon', 'other')),
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Generated images table (AI-generated thumbnails)
  CREATE TABLE IF NOT EXISTS generated_images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    image_data BLOB,
    image_url TEXT,
    width INTEGER NOT NULL DEFAULT 1024,
    height INTEGER NOT NULL DEFAULT 1024,
    model TEXT NOT NULL DEFAULT 'nano-banana',
    is_upscaled INTEGER NOT NULL DEFAULT 0,
    parent_image_id TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Content versions table (edit history)
  CREATE TABLE IF NOT EXISTS content_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('hook', 'body', 'intro', 'title', 'cta', 'visual')),
    content_index INTEGER NOT NULL,
    old_content TEXT NOT NULL,
    new_content TEXT NOT NULL,
    edited_by TEXT NOT NULL DEFAULT 'user' CHECK (edited_by IN ('user', 'assistant')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (project_id IS NOT NULL OR session_id IS NOT NULL)
  );

  -- Settings table (user-customizable prompts)
  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Favorites table
  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('hook', 'cta', 'body', 'visual', 'template', 'intro', 'title', 'thumbnail')),
    content TEXT NOT NULL,
    source_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    source_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Performance notes table
  CREATE TABLE IF NOT EXISTS performance_notes (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    project_id TEXT UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    views INTEGER,
    likes INTEGER,
    comments INTEGER,
    reposts INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (session_id IS NOT NULL OR project_id IS NOT NULL)
  );

  -- Research results table (stores web search results)
  CREATE TABLE IF NOT EXISTS research_results (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    results TEXT NOT NULL DEFAULT '[]',
    citations TEXT NOT NULL DEFAULT '[]',
    provider TEXT NOT NULL CHECK (provider IN ('claude', 'perplexity')),
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Project search settings table
  CREATE TABLE IF NOT EXISTS project_search_settings (
    id TEXT PRIMARY KEY,
    project_id TEXT UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    web_search_enabled INTEGER NOT NULL DEFAULT 0,
    search_provider TEXT NOT NULL DEFAULT 'claude' CHECK (search_provider IN ('claude', 'perplexity', 'auto')),
    max_searches INTEGER NOT NULL DEFAULT 5,
    allowed_domains TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Project sources table (text-based context for AI generation)
  CREATE TABLE IF NOT EXISTS project_sources (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('text', 'file', 'url')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    original_filename TEXT,
    original_url TEXT,
    mime_type TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Carousel templates table
  CREATE TABLE IF NOT EXISTS carousel_templates (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slide_count INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Carousel template slides table
  CREATE TABLE IF NOT EXISTS carousel_template_slides (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES carousel_templates(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    background_data BLOB,
    text_zones TEXT NOT NULL DEFAULT '[]'
  );

  -- Carousel outputs table (generated carousel content)
  CREATE TABLE IF NOT EXISTS carousel_outputs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_id TEXT REFERENCES carousel_templates(id) ON DELETE SET NULL,
    slides TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
  CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  CREATE INDEX IF NOT EXISTS idx_projects_platform ON projects(platform);
  CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
  CREATE INDEX IF NOT EXISTS idx_favorites_type ON favorites(type);
  CREATE INDEX IF NOT EXISTS idx_project_assets_project_id ON project_assets(project_id);
  CREATE INDEX IF NOT EXISTS idx_generated_images_project_id ON generated_images(project_id);
  CREATE INDEX IF NOT EXISTS idx_content_versions_project_id ON content_versions(project_id);
  CREATE INDEX IF NOT EXISTS idx_research_results_project_id ON research_results(project_id);
  CREATE INDEX IF NOT EXISTS idx_research_results_created_at ON research_results(created_at);
  CREATE INDEX IF NOT EXISTS idx_project_sources_project_id ON project_sources(project_id);
  CREATE INDEX IF NOT EXISTS idx_carousel_templates_project_id ON carousel_templates(project_id);
  CREATE INDEX IF NOT EXISTS idx_carousel_template_slides_template_id ON carousel_template_slides(template_id);
  CREATE INDEX IF NOT EXISTS idx_carousel_outputs_project_id ON carousel_outputs(project_id);
`)

// Migration helper: safely add columns if they don't exist
function addColumnIfNotExists(table: string, column: string, definition: string) {
  try {
    const pragma = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    const columnExists = pragma.some(col => col.name === column)
    if (!columnExists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    }
  } catch {
    // Table might not exist yet, which is fine
  }
}

// Run migrations for existing tables
// Messages table migrations
addColumnIfNotExists('messages', 'project_id', 'TEXT REFERENCES projects(id) ON DELETE CASCADE')

// Outputs table migrations
// Note: For existing databases, we need to handle the case where outputs table
// has NOT NULL constraint on session_id. This requires a table rebuild which
// is handled by migration scripts run outside of app initialization.
addColumnIfNotExists('outputs', 'project_id', 'TEXT')
addColumnIfNotExists('outputs', 'intros', "TEXT NOT NULL DEFAULT '[]'")
addColumnIfNotExists('outputs', 'intros_original', "TEXT NOT NULL DEFAULT '[]'")
addColumnIfNotExists('outputs', 'titles', "TEXT NOT NULL DEFAULT '[]'")
addColumnIfNotExists('outputs', 'titles_original', "TEXT NOT NULL DEFAULT '[]'")
addColumnIfNotExists('outputs', 'selected_intro_index', 'INTEGER DEFAULT 0')
addColumnIfNotExists('outputs', 'selected_title_index', 'INTEGER DEFAULT 0')
addColumnIfNotExists('outputs', 'selected_body_index', 'INTEGER DEFAULT 0')

// Favorites table migrations
addColumnIfNotExists('favorites', 'source_project_id', 'TEXT REFERENCES projects(id) ON DELETE SET NULL')

// Performance notes table migrations (UNIQUE constraint not supported via ALTER TABLE, handled by app)
addColumnIfNotExists('performance_notes', 'project_id', 'TEXT')

// Content versions table migrations
addColumnIfNotExists('content_versions', 'project_id', 'TEXT REFERENCES projects(id) ON DELETE CASCADE')

// Outputs table migrations for research
addColumnIfNotExists('outputs', 'research_context', 'TEXT')
addColumnIfNotExists('outputs', 'citations', "TEXT NOT NULL DEFAULT '[]'")

// Generated images table migrations (for thumbnail-to-visual-concept linkage)
addColumnIfNotExists('generated_images', 'visual_concept_index', 'INTEGER')

// Add index for visual_concept_index queries
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_generated_images_visual_concept ON generated_images(project_id, visual_concept_index)')
} catch {
  // Index might already exist
}

// REMOVED: The old migration that converted 0s to -1s was running on every server restart,
// which undid valid selections (0 is a valid selection meaning "first card selected").
// New records are now inserted with -1 in outputs/route.ts, so this migration is no longer needed.
// NOTE: 0 means "first card selected", -1 means "no selection", -2 means "explicitly skipped"

// Migration: Add 'setup' to projects.current_step CHECK constraint
// This was run manually on existing database - this code is kept for documentation
// The schema definition above now includes 'setup' for new databases

// Migration: Update projects table CHECK constraint to include 'carousel'
// IMPORTANT: This migration is now a no-op since the schema already includes 'carousel'
// The initial migration caused data loss due to CASCADE DELETE when dropping the table.
// Future schema changes requiring table rebuilds MUST:
// 1. Disable foreign keys: PRAGMA foreign_keys = OFF
// 2. Perform the migration in a transaction
// 3. Re-enable foreign keys: PRAGMA foreign_keys = ON
// 4. Run PRAGMA foreign_key_check to verify integrity
//
// The 'carousel' step is now included in the initial CREATE TABLE statement,
// so no migration is needed for new databases.

// Insert default system prompts if they don't exist
const defaultPrompts = [
  {
    key: 'master_voice_prompt',
    value: `You are writing in John E. Milad's voice. Optimize for clarity, credibility, decisiveness, and intellectual rigor. The reader is smart and busy.

Voice and posture:
- Clear, confident, and measured; authoritative without arrogance
- Decisive: take a position, make a recommendation, drive to action. Never end on "it depends"
- Evidence-led and precise: distinguish facts from interpretation. Label uncertainty explicitly (e.g., "Confidence: medium") — but still choose a best answer

No equivocation:
- Do not hedge with excessive qualifiers unless uncertainty is real and material
- When uncertain: (1) state the recommendation anyway, (2) state key assumptions, (3) state what would change your mind

Stylistic models (directional):
- The Economist editorial voice; Krugman (argument clarity), Michael Lewis (narrative efficiency), Buffett (plainspoken pragmatism)

Core writing principles:
- Lead with the point: first sentence states purpose and conclusion
- Tight logical flow: claim → evidence → implication → next step
- Prefer concrete specifics (numbers, dates, thresholds) over abstractions
- Maintain nuance without dithering: acknowledge trade-offs, then pick the best path

Sentence and paragraph style:
- Short-to-medium sentences; active voice; minimal filler
- Short paragraphs (1–3 sentences). Use white space
- Bullets for lists; numbered lists for sequences or decisions

Prohibitions:
- Do not invent facts, dates, quotes, or commitments
- Avoid jargon unless it increases precision (and define it briefly)
- Avoid motivational/cheerleading language
- No emojis by default`
  },
  {
    key: 'linkedin_tone_prompt',
    value: `LinkedIn tone modifier:
- Concise, science-first, and thoughtful
- One clear takeaway per post — the reader should walk away with a single actionable insight
- Minimal fluff: no motivational filler, no "I'm excited to announce" preamble
- Short paragraphs (1–2 sentences) for mobile readability; use white space aggressively
- Lead with a contrarian or non-obvious insight, not self-promotion
- End with a clear question or single CTA to drive engagement
- Professional but not stiff — measured warmth, not corporate-speak`
  },
  {
    key: 'youtube_tone_prompt',
    value: `YouTube tone modifier:
- Authoritative but conversational — the Economist meets a smart friend explaining over coffee
- Front-load value: state what the viewer will learn in the first 10 seconds
- Decisive and direct: take a clear position, don't waffle
- Short sentences for spoken delivery; natural speech patterns with verbal emphasis cues
- Use curiosity loops to maintain watch time, but always deliver on promises (no clickbait)
- Concrete specifics: numbers, examples, thresholds — not vague generalizations
- End with one clear CTA (subscribe, comment, next video) — never stack multiple asks`
  },
  {
    key: 'facebook_tone_prompt',
    value: `Facebook tone modifier:
- Casual, authentic, playful, and approachable
- Write as if to a friendly, intimate audience — not a professional network
- Use contractions, light humor, and simple language
- Keep it human and unpolished (but still clear and purposeful)
- Share a viewpoint and personal reaction; avoid corporate tone entirely
- Storytelling-first: lead with personal anecdotes or relatable observations
- It's fine to be opinionated and direct — the audience values authenticity over polish`
  },
  {
    key: 'hooks_agent_prompt',
    value: `You are an expert content hook writer specializing in attention-grabbing opening lines.
Your hooks should:
- Stop the scroll immediately
- Create curiosity or emotional connection
- Be concise (1-2 sentences max)
- Avoid clickbait - deliver real value
- Match the tone specified by the user`
  },
  {
    key: 'body_agent_prompt',
    value: `You are an expert content body writer focused on engaging, valuable content.
Your body content should:
- Be 150-300 words for optimal engagement
- Use short paragraphs (1-2 sentences) for mobile readability
- Include specific details, numbers, and examples
- Flow logically from hook to conclusion
- Deliver genuine value to the reader`
  },
  {
    key: 'intros_agent_prompt',
    value: `You are an expert video intro writer for YouTube content.
Your intros should:
- Hook viewers in the first 5-10 seconds
- Clearly state what the video will cover
- Create anticipation for the content
- Match the creator's style and tone
- Be concise but compelling`
  },
  {
    key: 'titles_agent_prompt',
    value: `You are an expert title writer for content optimization.
Your titles should:
- Be compelling and clickable
- Include relevant keywords naturally
- Create curiosity without being clickbait
- Be appropriate length for the platform
- Accurately represent the content`
  },
  {
    key: 'ctas_agent_prompt',
    value: `You are an expert call-to-action writer.
Your CTAs should:
- Be clear and actionable
- Create urgency or motivation
- Match the content's tone
- Drive meaningful engagement
- Feel natural, not pushy`
  },
  {
    key: 'thumbnails_agent_prompt',
    value: `You are an expert thumbnail concept designer.
Your thumbnail concepts should:
- Be visually striking and eye-catching
- Communicate the content's value at a glance
- Use bold colors and clear text
- Feature the creator when appropriate
- Stand out in a crowded feed`
  }
]

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO settings (id, key, value)
  VALUES (?, ?, ?)
`)

for (const prompt of defaultPrompts) {
  insertSetting.run(prompt.key, prompt.key, prompt.value)
}

// Migrate old generic voice/tone defaults to personalized defaults
// Only updates rows that still have the old placeholder text (won't overwrite user customizations)
const migratePrompt = db.prepare(`UPDATE settings SET value = ? WHERE key = ? AND value LIKE ?`)
for (const prompt of defaultPrompts.slice(0, 4)) {
  const oldPrefixes: Record<string, string> = {
    master_voice_prompt: 'You write with an authentic%',
    linkedin_tone_prompt: 'Tone modifier for LinkedIn:%',
    youtube_tone_prompt: 'Tone modifier for YouTube:%',
    facebook_tone_prompt: 'Tone modifier for Facebook:%',
  }
  const prefix = oldPrefixes[prompt.key]
  if (prefix) {
    migratePrompt.run(prompt.value, prompt.key, prefix)
  }
}

export default db
