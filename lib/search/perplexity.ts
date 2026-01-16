import { generateId } from '@/lib/utils'
import type { PerplexityOptions, SearchResult, SearchResultItem, Citation } from './types'

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

export function isConfigured(): boolean {
  return !!process.env.PERPLEXITY_API_KEY
}

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PerplexityResponse {
  id: string
  model: string
  object: string
  created: number
  citations?: string[]
  choices: Array<{
    index: number
    finish_reason: string
    message: {
      role: string
      content: string
    }
    delta?: {
      role?: string
      content?: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Perform a web search using Perplexity API
 */
export async function searchWithPerplexity(
  query: string,
  options: PerplexityOptions = {}
): Promise<SearchResult> {
  if (!isConfigured()) {
    throw new Error('Perplexity API key is not configured')
  }

  const messages: PerplexityMessage[] = [
    {
      role: 'system',
      content: 'You are a research assistant. Provide comprehensive, well-sourced information on the given topic. Include specific facts, statistics, and recent developments. Cite your sources.',
    },
    {
      role: 'user',
      content: `Research the following topic and provide detailed, up-to-date information:

${query}

Please include:
1. Key facts and statistics
2. Recent developments and trends
3. Expert insights
4. Relevant examples`,
    },
  ]

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.deepResearch ? 'sonar-pro' : 'sonar',
      messages,
      ...(options.recencyFilter && {
        search_recency_filter: options.recencyFilter,
      }),
      ...(options.allowedDomains && {
        search_domain_filter: options.allowedDomains,
      }),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`)
  }

  const data: PerplexityResponse = await response.json()

  return parsePerplexityResponse(data, query)
}

/**
 * Parse Perplexity's response to extract search results and citations
 */
function parsePerplexityResponse(
  response: PerplexityResponse,
  query: string
): SearchResult {
  const content = response.choices[0]?.message?.content || ''
  const rawCitations = response.citations || []

  // Convert citation URLs to our format
  const citations: Citation[] = rawCitations.map((url, index) => ({
    url,
    title: extractDomainName(url),
    citedText: `Source ${index + 1}`,
  }))

  // Create search result items from citations
  const results: SearchResultItem[] = rawCitations.map((url) => ({
    url,
    title: extractDomainName(url),
    snippet: '',
  }))

  // Extract key facts from the content
  const keyFacts = extractKeyFacts(content)

  return {
    id: generateId(),
    query,
    results,
    citations,
    provider: 'perplexity',
    summary: content,
    created_at: new Date().toISOString(),
  }
}

/**
 * Extract domain name from URL for display
 */
function extractDomainName(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

/**
 * Extract key facts from content (simple heuristic)
 */
function extractKeyFacts(content: string): string[] {
  const facts: string[] = []

  // Look for bullet points or numbered lists
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    // Match bullet points, numbers, or lines starting with dash
    if (/^[\-\*•]\s+/.test(trimmed) || /^\d+[\.\)]\s+/.test(trimmed)) {
      const fact = trimmed.replace(/^[\-\*•\d\.\)]+\s*/, '').trim()
      if (fact.length > 10 && fact.length < 200) {
        facts.push(fact)
      }
    }
  }

  return facts.slice(0, 10) // Limit to 10 key facts
}

/**
 * Quick research for content generation context
 */
export async function quickResearch(
  topic: string,
  targetAudience?: string
): Promise<{
  summary: string
  keyFacts: string[]
  sources: string[]
}> {
  const query = targetAudience
    ? `${topic} for ${targetAudience} audience`
    : topic

  const result = await searchWithPerplexity(query, {
    deepResearch: false,
    recencyFilter: 'month',
  })

  return {
    summary: result.summary || '',
    keyFacts: extractKeyFacts(result.summary || ''),
    sources: result.citations.map(c => c.url),
  }
}
