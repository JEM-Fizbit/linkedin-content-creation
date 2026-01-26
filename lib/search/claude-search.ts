import Anthropic from '@anthropic-ai/sdk'
import { generateId } from '@/lib/utils'
import type { SearchOptions, SearchResult, SearchResultItem, Citation } from './types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export function isConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * Perform a web search using Claude's built-in web search tool
 */
export async function searchWithClaude(
  query: string,
  options: Partial<SearchOptions> = {}
): Promise<SearchResult> {
  if (!isConfigured()) {
    throw new Error('Anthropic API key is not configured')
  }

  const searchPrompt = `Research the following topic and provide relevant, up-to-date information:

Topic: ${query}

Please search the web for:
1. Recent news and developments
2. Key statistics and data points
3. Expert opinions and insights
4. Relevant examples and case studies

Provide a comprehensive summary of your findings.`

  // Web search is a server-side tool - cast to any to satisfy TypeScript
  // See: https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/web-search-tool
  const webSearchTool = {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: options.maxSearches || 5,
    ...(options.allowedDomains && { allowed_domains: options.allowedDomains }),
    ...(options.blockedDomains && { blocked_domains: options.blockedDomains }),
  } as const

  // Create with timeout to prevent indefinite hanging
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000) // 60 second timeout

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: searchPrompt }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [webSearchTool as any]
    }, { signal: controller.signal })

    clearTimeout(timeout)
    return parseClaudeSearchResponse(response, query)
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Web search timed out after 60 seconds')
    }
    throw error
  }
}

/**
 * Parse Claude's response to extract search results and citations
 */
function parseClaudeSearchResponse(
  response: Anthropic.Message,
  query: string
): SearchResult {
  const results: SearchResultItem[] = []
  const citations: Citation[] = []
  let summary = ''

  for (const block of response.content) {
    // Extract text content
    if (block.type === 'text') {
      summary += block.text

      // Extract citations from the text block if present
      // Web search citations have type 'web_search_result_location' which is not in base SDK types
      if ('citations' in block && Array.isArray(block.citations)) {
        for (const citation of block.citations) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const citationType = (citation as any).type
          if (citationType === 'web_search_result_location') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const webCitation = citation as any
            citations.push({
              url: webCitation.url || '',
              title: webCitation.title || '',
              citedText: webCitation.cited_text || '',
            })
          }
        }
      }
    }

    // Handle web search results (server-side tool types not in base SDK)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blockType = (block as any).type

    // Extract search results from web_search_tool_result blocks
    if (blockType === 'web_search_tool_result') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultBlock = block as any
      if (resultBlock.content && Array.isArray(resultBlock.content)) {
        for (const item of resultBlock.content) {
          if (item.type === 'web_search_result') {
            results.push({
              url: item.url || '',
              title: item.title || '',
              snippet: '', // Encrypted content, not directly accessible
              pageAge: item.page_age,
            })
          }
        }
      }
    }
  }

  return {
    id: generateId(),
    query,
    results,
    citations,
    provider: 'claude',
    summary: summary.trim(),
    created_at: new Date().toISOString(),
  }
}

/**
 * Generate content with web search enabled
 */
export async function generateWithSearch(
  prompt: string,
  systemPrompt: string,
  options: Partial<SearchOptions> = {}
): Promise<{
  content: string
  citations: Citation[]
  searchResults: SearchResultItem[]
}> {
  if (!isConfigured()) {
    throw new Error('Anthropic API key is not configured')
  }

  // Web search is a server-side tool - cast to any to satisfy TypeScript
  const webSearchTool = {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: options.maxSearches || 5,
    ...(options.allowedDomains && { allowed_domains: options.allowedDomains }),
    ...(options.blockedDomains && { blocked_domains: options.blockedDomains }),
  } as const

  // Create with timeout to prevent indefinite hanging
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000) // 60 second timeout

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [webSearchTool as any]
    }, { signal: controller.signal })

    clearTimeout(timeout)
    const parsed = parseClaudeSearchResponse(response, prompt)

    return {
      content: parsed.summary || '',
      citations: parsed.citations,
      searchResults: parsed.results,
    }
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Web search generation timed out after 60 seconds')
    }
    throw error
  }
}
