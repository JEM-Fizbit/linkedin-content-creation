// Search Types

export interface SearchOptions {
  enabled: boolean
  provider: 'claude' | 'perplexity' | 'auto'
  maxSearches?: number
  allowedDomains?: string[]
  blockedDomains?: string[]
}

export interface PerplexityOptions {
  deepResearch?: boolean
  recencyFilter?: 'day' | 'week' | 'month' | 'year'
  allowedDomains?: string[]
}

export interface SearchResultItem {
  url: string
  title: string
  snippet: string
  pageAge?: string
}

export interface Citation {
  url: string
  title: string
  citedText: string
}

export interface SearchResult {
  id: string
  query: string
  results: SearchResultItem[]
  citations: Citation[]
  provider: 'claude' | 'perplexity'
  summary?: string
  created_at: string
}

export interface ResearchContext {
  searchResults: SearchResult[]
  summary: string
  keyFacts: string[]
  relevantSources: string[]
}

export interface ProjectSearchSettings {
  webSearchEnabled: boolean
  searchProvider: 'claude' | 'perplexity' | 'auto'
  maxSearches: number
  allowedDomains?: string[]
}
