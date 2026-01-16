import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId, safeJsonParse } from '@/lib/utils'
import anthropic, { SYSTEM_PROMPT, CONTENT_GENERATION_PROMPT, isConfigured } from '@/lib/claude'
import { isSearchConfigured, conductResearch, buildResearchContext, formatResearchForPrompt } from '@/lib/search'
import type { Output, Message, VisualConcept, Project, Session, Platform, Citation, ResearchContext, SearchResult } from '@/types'

interface GeneratedContent {
  hooks: string[]
  body_content: string
  intros: string[]
  titles: string[]
  ctas: string[]
  visual_concepts: VisualConcept[]
  citations?: Citation[]
  researchContext?: ResearchContext
}

// Platform-specific content generation prompts
const PLATFORM_GENERATION_PROMPTS: Record<Platform, string> = {
  linkedin: `Generate content for a LinkedIn post. Include:
- 5 attention-grabbing hooks (opening lines)
- Body content (150-300 words)
- 3 call-to-action options
- 3 visual concept descriptions for accompanying images`,

  youtube: `Generate content for a YouTube video. Include:
- 5 attention-grabbing hooks (video opening lines)
- 3 video intro scripts (30-60 seconds each)
- 5 video title options (SEO-optimized, under 60 characters)
- 3 thumbnail concept descriptions`,

  facebook: `Generate content for a Facebook post. Include:
- 5 attention-grabbing hooks (opening lines)
- Body content (100-250 words)
- 3 call-to-action options
- 3 visual concept descriptions for accompanying images`,
}

// POST /api/outputs - Generate structured output for a session or project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, project_id } = body

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
    let messages: Message[] = []
    let existingOutput: Output | undefined

    // Handle project-based generation (new)
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
      messages = messagesStmt.all(project_id) as Message[]

      const existingOutputStmt = db.prepare('SELECT * FROM outputs WHERE project_id = ?')
      const outputRow = existingOutputStmt.get(project_id) as Record<string, unknown> | undefined
      if (outputRow) {
        existingOutput = parseOutputRow(outputRow)
      }
    }
    // Handle session-based generation (legacy)
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

      const messagesStmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
      messages = messagesStmt.all(session_id) as Message[]

      const existingOutputStmt = db.prepare('SELECT * FROM outputs WHERE session_id = ?')
      const outputRow = existingOutputStmt.get(session_id) as Record<string, unknown> | undefined
      if (outputRow) {
        existingOutput = parseOutputRow(outputRow)
      }
    }

    if (!contextInfo) {
      return NextResponse.json(
        { error: 'Unable to load context' },
        { status: 500 }
      )
    }

    // Generate structured content using Claude with optional web search
    const generatedContent = await generateStructuredContent(contextInfo, messages, project_id)

    const now = new Date().toISOString()

    // Save research result to database if we have one
    if (project_id && generatedContent.researchContext && generatedContent.citations?.length) {
      try {
        const researchId = generateId()
        const insertResearchStmt = db.prepare(`
          INSERT INTO research_results (id, project_id, query, results, citations, provider, summary, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertResearchStmt.run(
          researchId,
          project_id,
          contextInfo.topic,
          JSON.stringify(generatedContent.researchContext.searchResults),
          JSON.stringify(generatedContent.citations),
          'claude', // Default provider for now
          generatedContent.researchContext.summary,
          now
        )
      } catch (error) {
        console.error('Failed to save research results:', error)
      }
    }

    if (existingOutput) {
      // Update existing output
      const updateStmt = db.prepare(`
        UPDATE outputs
        SET hooks = ?, body_content = ?, intros = ?, titles = ?, ctas = ?, visual_concepts = ?,
            research_context = ?, citations = ?, updated_at = ?
        WHERE ${project_id ? 'project_id' : 'session_id'} = ?
      `)
      updateStmt.run(
        JSON.stringify(generatedContent.hooks),
        generatedContent.body_content,
        JSON.stringify(generatedContent.intros),
        JSON.stringify(generatedContent.titles),
        JSON.stringify(generatedContent.ctas),
        JSON.stringify(generatedContent.visual_concepts),
        generatedContent.researchContext ? JSON.stringify(generatedContent.researchContext) : null,
        JSON.stringify(generatedContent.citations || []),
        now,
        project_id || session_id
      )

      const output: Output = {
        ...existingOutput,
        hooks: generatedContent.hooks,
        body_content: generatedContent.body_content,
        intros: generatedContent.intros,
        titles: generatedContent.titles,
        ctas: generatedContent.ctas,
        visual_concepts: generatedContent.visual_concepts,
        research_context: generatedContent.researchContext,
        citations: generatedContent.citations,
        updated_at: now,
      }

      return NextResponse.json({ output })
    } else {
      // Create new output
      const outputId = generateId()

      if (project_id) {
        const insertStmt = db.prepare(`
          INSERT INTO outputs (
            id, project_id, hooks, hooks_original, body_content, body_content_original,
            intros, intros_original, titles, titles_original,
            ctas, ctas_original, visual_concepts, visual_concepts_original,
            research_context, citations,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertStmt.run(
          outputId,
          project_id,
          JSON.stringify(generatedContent.hooks),
          JSON.stringify(generatedContent.hooks),
          generatedContent.body_content,
          generatedContent.body_content,
          JSON.stringify(generatedContent.intros),
          JSON.stringify(generatedContent.intros),
          JSON.stringify(generatedContent.titles),
          JSON.stringify(generatedContent.titles),
          JSON.stringify(generatedContent.ctas),
          JSON.stringify(generatedContent.ctas),
          JSON.stringify(generatedContent.visual_concepts),
          JSON.stringify(generatedContent.visual_concepts),
          generatedContent.researchContext ? JSON.stringify(generatedContent.researchContext) : null,
          JSON.stringify(generatedContent.citations || []),
          now,
          now
        )
      } else {
        const insertStmt = db.prepare(`
          INSERT INTO outputs (
            id, session_id, hooks, hooks_original, body_content, body_content_original,
            intros, intros_original, titles, titles_original,
            ctas, ctas_original, visual_concepts, visual_concepts_original,
            research_context, citations,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertStmt.run(
          outputId,
          session_id,
          JSON.stringify(generatedContent.hooks),
          JSON.stringify(generatedContent.hooks),
          generatedContent.body_content,
          generatedContent.body_content,
          JSON.stringify(generatedContent.intros),
          JSON.stringify(generatedContent.intros),
          JSON.stringify(generatedContent.titles),
          JSON.stringify(generatedContent.titles),
          JSON.stringify(generatedContent.ctas),
          JSON.stringify(generatedContent.ctas),
          JSON.stringify(generatedContent.visual_concepts),
          JSON.stringify(generatedContent.visual_concepts),
          generatedContent.researchContext ? JSON.stringify(generatedContent.researchContext) : null,
          JSON.stringify(generatedContent.citations || []),
          now,
          now
        )
      }

      const output: Output = {
        id: outputId,
        session_id: session_id || undefined,
        project_id: project_id || undefined,
        hooks: generatedContent.hooks,
        hooks_original: generatedContent.hooks,
        selected_hook_index: 0,
        body_content: generatedContent.body_content,
        body_content_original: generatedContent.body_content,
        selected_body_index: 0,
        intros: generatedContent.intros,
        intros_original: generatedContent.intros,
        selected_intro_index: 0,
        titles: generatedContent.titles,
        titles_original: generatedContent.titles,
        selected_title_index: 0,
        ctas: generatedContent.ctas,
        ctas_original: generatedContent.ctas,
        selected_cta_index: 0,
        visual_concepts: generatedContent.visual_concepts,
        visual_concepts_original: generatedContent.visual_concepts,
        selected_visual_index: 0,
        research_context: generatedContent.researchContext,
        citations: generatedContent.citations,
        created_at: now,
        updated_at: now,
      }

      return NextResponse.json({ output })
    }
  } catch (error) {
    console.error('Error generating output:', error)
    return NextResponse.json(
      { error: 'Failed to generate output' },
      { status: 500 }
    )
  }
}

// Parse a database output row into an Output object
function parseOutputRow(row: Record<string, unknown>): Output {
  return {
    id: row.id as string,
    session_id: row.session_id as string | undefined,
    project_id: row.project_id as string | undefined,
    hooks: safeJsonParse(row.hooks as string, []),
    hooks_original: safeJsonParse(row.hooks_original as string, []),
    selected_hook_index: row.selected_hook_index as number || 0,
    body_content: row.body_content as string || '',
    body_content_original: row.body_content_original as string || '',
    selected_body_index: row.selected_body_index as number || 0,
    intros: safeJsonParse(row.intros as string, []),
    intros_original: safeJsonParse(row.intros_original as string, []),
    selected_intro_index: row.selected_intro_index as number || 0,
    titles: safeJsonParse(row.titles as string, []),
    titles_original: safeJsonParse(row.titles_original as string, []),
    selected_title_index: row.selected_title_index as number || 0,
    ctas: safeJsonParse(row.ctas as string, []),
    ctas_original: safeJsonParse(row.ctas_original as string, []),
    selected_cta_index: row.selected_cta_index as number || 0,
    visual_concepts: safeJsonParse(row.visual_concepts as string, []),
    visual_concepts_original: safeJsonParse(row.visual_concepts_original as string, []),
    selected_visual_index: row.selected_visual_index as number || 0,
    research_context: row.research_context ? safeJsonParse(row.research_context as string, undefined) : undefined,
    citations: safeJsonParse(row.citations as string, []),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

// Get project search settings from database
function getProjectSearchSettings(projectId: string): { enabled: boolean; provider: 'claude' | 'perplexity' | 'auto'; maxSearches: number } {
  try {
    const stmt = db.prepare('SELECT * FROM project_search_settings WHERE project_id = ?')
    const settings = stmt.get(projectId) as { web_search_enabled: number; search_provider: string; max_searches: number } | undefined

    if (settings) {
      return {
        enabled: settings.web_search_enabled === 1,
        provider: settings.search_provider as 'claude' | 'perplexity' | 'auto',
        maxSearches: settings.max_searches
      }
    }
  } catch {
    // Table might not exist or other error, use defaults
  }

  // Default: web search enabled with Claude provider
  return { enabled: true, provider: 'claude', maxSearches: 5 }
}

// Generate structured content using Claude API with optional web search
async function generateStructuredContent(
  contextInfo: { topic: string; platform: Platform; targetAudience?: string; contentStyle?: string },
  messages: Message[],
  projectId?: string
): Promise<GeneratedContent> {
  // Get search settings for this project
  const searchSettings = projectId ? getProjectSearchSettings(projectId) : { enabled: true, provider: 'claude' as const, maxSearches: 5 }
  const useWebSearch = searchSettings.enabled && isSearchConfigured()

  // Conduct research if enabled
  let researchContext: ResearchContext | undefined
  let researchSearchResult: SearchResult | undefined

  if (useWebSearch) {
    try {
      const researchQuery = contextInfo.targetAudience
        ? `${contextInfo.topic} - trends, insights, and best practices for ${contextInfo.targetAudience}`
        : `${contextInfo.topic} - trends, insights, and best practices`

      researchSearchResult = await conductResearch(researchQuery, {
        enabled: true,
        provider: searchSettings.provider,
        maxSearches: searchSettings.maxSearches
      })

      researchContext = buildResearchContext([researchSearchResult])
      console.log(`Research conducted: ${researchSearchResult.citations.length} citations found`)
    } catch (error) {
      console.error('Research failed, proceeding without:', error)
    }
  }

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

  // Add research context if available
  if (researchContext) {
    contextDesc += formatResearchForPrompt(researchContext)
  }

  const platformPrompt = PLATFORM_GENERATION_PROMPTS[contextInfo.platform]

  const prompt = `${contextDesc}

Conversation history:
${conversationContext || 'No conversation yet.'}

Based on the above context${researchContext ? ' and research findings' : ''}, ${platformPrompt}

${CONTENT_GENERATION_PROMPT}

${researchContext ? 'IMPORTANT: Use the research context provided to make your content factually accurate and up-to-date. Reference specific insights or statistics where relevant.' : ''}

Return your response as a JSON object with this structure:
{
  "hooks": ["hook1", "hook2", ...],
  "body_content": "full body text here",
  "intros": ["intro1", "intro2", ...],
  "titles": ["title1", "title2", ...],
  "ctas": ["cta1", "cta2", ...],
  "visual_concepts": [{"description": "visual concept 1"}, ...]
}

For ${contextInfo.platform === 'youtube' ? 'YouTube content, focus on intros, titles, and visual_concepts (thumbnails). body_content can be a brief description.' : 'LinkedIn/Facebook content, focus on hooks, body_content, ctas, and visual_concepts. intros and titles can be empty arrays.'}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    // Try to parse the JSON response
    // Remove any markdown code blocks if present
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

    const parsed = JSON.parse(jsonStr)
    return {
      hooks: parsed.hooks || [],
      body_content: parsed.body_content || '',
      intros: parsed.intros || [],
      titles: parsed.titles || [],
      ctas: parsed.ctas || [],
      visual_concepts: parsed.visual_concepts || [],
      citations: researchSearchResult?.citations,
      researchContext
    }
  } catch {
    // If JSON parsing fails, return a fallback structure
    console.error('Failed to parse Claude response as JSON:', responseText)
    return {
      ...getDefaultContent(contextInfo.platform, responseText),
      citations: researchSearchResult?.citations,
      researchContext
    }
  }
}

// Get default content based on platform
function getDefaultContent(platform: Platform, fallbackText: string): GeneratedContent {
  if (platform === 'youtube') {
    return {
      hooks: [
        'In this video, I\'m going to show you something that changed everything...',
        'What if I told you there\'s a better way?',
        'Stop what you\'re doing - this is important.'
      ],
      body_content: fallbackText || 'Video description pending.',
      intros: [
        'Hey everyone! Welcome back to the channel. Today we\'re diving into something exciting...',
        'What\'s up! If you\'re new here, hit that subscribe button because this one\'s going to be good...',
        'Before we get started, I want to share something that completely changed my perspective...'
      ],
      titles: [
        'This Changed Everything (You Need To See This)',
        'The Secret Most People Don\'t Know',
        'I Tested This For 30 Days - Here\'s What Happened'
      ],
      ctas: [],
      visual_concepts: [
        { description: 'Thumbnail with shocked face expression and bold text overlay' },
        { description: 'Before/after split image showing transformation' },
        { description: 'Clean thumbnail with key stat highlighted' }
      ]
    }
  }

  return {
    hooks: [
      'Here\'s a perspective that might change how you think about this topic...',
      'I learned something surprising recently that I need to share...',
      'Most people get this wrong. Here\'s what I discovered...'
    ],
    body_content: fallbackText || 'Content generation failed. Please try again.',
    intros: [],
    titles: [],
    ctas: [
      'What\'s your take on this? Share in the comments below.',
      'If this resonated, follow me for more insights.',
      'Tag someone who needs to see this.'
    ],
    visual_concepts: [
      { description: 'A clean infographic highlighting the key points' },
      { description: 'A quote card with the main insight' },
      { description: 'A carousel breaking down the topic step by step' }
    ]
  }
}
