// Search Library - Main exports and orchestration

export * from './types'
export { searchWithClaude, generateWithSearch, isConfigured as isClaudeSearchConfigured } from './claude-search'
export { searchWithPerplexity, quickResearch, isConfigured as isPerplexityConfigured } from './perplexity'

import { searchWithClaude, generateWithSearch, isConfigured as isClaudeConfigured } from './claude-search'
import { searchWithPerplexity, quickResearch, isConfigured as isPerplexityConfigured } from './perplexity'
import type { SearchOptions, SearchResult, PerplexityOptions, ResearchContext, Citation, SearchResultItem } from './types'

/**
 * Check if any search provider is configured
 */
export function isSearchConfigured(): boolean {
  return isClaudeConfigured() || isPerplexityConfigured()
}

/**
 * Get available search providers
 */
export function getAvailableProviders(): ('claude' | 'perplexity')[] {
  const providers: ('claude' | 'perplexity')[] = []
  if (isClaudeConfigured()) providers.push('claude')
  if (isPerplexityConfigured()) providers.push('perplexity')
  return providers
}

/**
 * Perform research using the specified provider or auto-select
 */
export async function conductResearch(
  query: string,
  options: Partial<SearchOptions> = {}
): Promise<SearchResult> {
  const provider = options.provider || 'auto'
  const enabled = options.enabled ?? true

  if (!enabled) {
    throw new Error('Search is disabled')
  }

  // Auto-select provider
  if (provider === 'auto') {
    if (isClaudeConfigured()) {
      return searchWithClaude(query, options)
    } else if (isPerplexityConfigured()) {
      return searchWithPerplexity(query, { deepResearch: false })
    } else {
      throw new Error('No search provider configured')
    }
  }

  // Use specified provider
  if (provider === 'claude') {
    if (!isClaudeConfigured()) {
      throw new Error('Claude API is not configured')
    }
    return searchWithClaude(query, options)
  }

  if (provider === 'perplexity') {
    if (!isPerplexityConfigured()) {
      throw new Error('Perplexity API is not configured')
    }
    return searchWithPerplexity(query, { deepResearch: false })
  }

  throw new Error(`Unknown provider: ${provider}`)
}

/**
 * Deep research using Perplexity (more thorough, for complex topics)
 */
export async function conductDeepResearch(
  query: string,
  options: PerplexityOptions = {}
): Promise<SearchResult> {
  if (!isPerplexityConfigured()) {
    // Fall back to Claude with more searches
    if (isClaudeConfigured()) {
      return searchWithClaude(query, { maxSearches: 10 })
    }
    throw new Error('No deep research provider configured (Perplexity preferred)')
  }

  return searchWithPerplexity(query, { ...options, deepResearch: true })
}

/**
 * Build research context from search results
 */
export function buildResearchContext(
  searchResults: SearchResult[]
): ResearchContext {
  const allCitations: Citation[] = []
  const allSources: string[] = []
  const allFacts: string[] = []
  const summaries: string[] = []

  for (const result of searchResults) {
    // Collect citations
    allCitations.push(...result.citations)

    // Collect unique sources
    for (const citation of result.citations) {
      if (citation.url && !allSources.includes(citation.url)) {
        allSources.push(citation.url)
      }
    }

    // Collect summary
    if (result.summary) {
      summaries.push(result.summary)

      // Extract key facts from summary
      const lines = result.summary.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (/^[\-\*•]\s+/.test(trimmed) || /^\d+[\.\)]\s+/.test(trimmed)) {
          const fact = trimmed.replace(/^[\-\*•\d\.\)]+\s*/, '').trim()
          if (fact.length > 10 && fact.length < 200 && !allFacts.includes(fact)) {
            allFacts.push(fact)
          }
        }
      }
    }
  }

  return {
    searchResults,
    summary: summaries.join('\n\n'),
    keyFacts: allFacts.slice(0, 15), // Limit to 15 key facts
    relevantSources: allSources.slice(0, 10), // Limit to 10 sources
  }
}

/**
 * Format research context for inclusion in a prompt
 */
export function formatResearchForPrompt(context: ResearchContext): string {
  if (!context.keyFacts.length && !context.summary) {
    return ''
  }

  let formatted = '\n\n--- RESEARCH CONTEXT ---\n'

  if (context.keyFacts.length > 0) {
    formatted += '\nKey Facts:\n'
    for (const fact of context.keyFacts) {
      formatted += `• ${fact}\n`
    }
  }

  if (context.relevantSources.length > 0) {
    formatted += '\nSources:\n'
    for (const source of context.relevantSources.slice(0, 5)) {
      formatted += `• ${source}\n`
    }
  }

  formatted += '\n--- END RESEARCH ---\n\n'

  return formatted
}

/**
 * Generate research-backed content
 */
export async function generateResearchBackedContent(
  topic: string,
  targetAudience: string | undefined,
  systemPrompt: string,
  contentPrompt: string,
  options: Partial<SearchOptions> = {}
): Promise<{
  content: string
  citations: Citation[]
  searchResults: SearchResultItem[]
  researchContext: ResearchContext
}> {
  const useSearch = options.enabled ?? true

  if (!useSearch || !isSearchConfigured()) {
    // Generate without research
    return {
      content: '',
      citations: [],
      searchResults: [],
      researchContext: {
        searchResults: [],
        summary: '',
        keyFacts: [],
        relevantSources: [],
      },
    }
  }

  // Conduct research first
  const researchQuery = targetAudience
    ? `${topic} - trends, insights, and best practices for ${targetAudience}`
    : `${topic} - trends, insights, and best practices`

  const searchResult = await conductResearch(researchQuery, options)
  const researchContext = buildResearchContext([searchResult])

  // Format research for prompt
  const researchPrompt = formatResearchForPrompt(researchContext)

  // Generate content with research context
  const enhancedPrompt = contentPrompt + researchPrompt

  const result = await generateWithSearch(
    enhancedPrompt,
    systemPrompt,
    { ...options, enabled: false } // Don't search again, we already have context
  )

  return {
    content: result.content,
    citations: [...searchResult.citations, ...result.citations],
    searchResults: searchResult.results,
    researchContext,
  }
}
