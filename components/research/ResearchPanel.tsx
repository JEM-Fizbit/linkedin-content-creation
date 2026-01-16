'use client'

import { useState } from 'react'
import { Globe, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Sparkles, Search, X, Check } from 'lucide-react'
import type { ResearchContext, Citation, SearchResult } from '@/types'

interface ResearchPanelProps {
  research?: ResearchContext
  citations?: Citation[]
  isLoading?: boolean
  onRefresh?: () => void
  onDeepResearch?: () => void
  projectId?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function ResearchPanel({
  research,
  citations = [],
  isLoading = false,
  onRefresh,
  onDeepResearch,
  collapsed = false,
  onToggleCollapse
}: ResearchPanelProps) {
  const [showAllFacts, setShowAllFacts] = useState(false)
  const [showAllSources, setShowAllSources] = useState(false)

  const hasResearch = research && (research.keyFacts.length > 0 || research.relevantSources.length > 0)
  const hasCitations = citations.length > 0

  if (!hasResearch && !hasCitations && !isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Globe className="w-5 h-5" />
          <span className="text-sm">No research data available. Generate content to conduct web research.</span>
        </div>
      </div>
    )
  }

  const displayedFacts = showAllFacts ? research?.keyFacts : research?.keyFacts.slice(0, 5)
  const displayedSources = showAllSources ? research?.relevantSources : research?.relevantSources.slice(0, 5)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Globe className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Research</h3>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {onDeepResearch && (
            <button
              onClick={onDeepResearch}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50"
              title="Conduct deep research using Perplexity"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Deep Research
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh research"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-blue-500">
                <Search className="w-5 h-5 animate-pulse" />
                <span className="text-sm">Researching...</span>
              </div>
            </div>
          )}

          {!isLoading && (
            <>
              {/* Key Facts */}
              {research && research.keyFacts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-500" />
                    Key Facts ({research.keyFacts.length})
                  </h4>
                  <ul className="space-y-2">
                    {displayedFacts?.map((fact, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                  {research.keyFacts.length > 5 && (
                    <button
                      onClick={() => setShowAllFacts(!showAllFacts)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showAllFacts ? 'Show less' : `Show all ${research.keyFacts.length} facts`}
                    </button>
                  )}
                </div>
              )}

              {/* Citations */}
              {hasCitations && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-blue-500" />
                    Citations ({citations.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {citations.slice(0, 6).map((citation, index) => (
                      <CitationBadge key={index} citation={citation} />
                    ))}
                    {citations.length > 6 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                        +{citations.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Sources */}
              {research && research.relevantSources.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sources ({research.relevantSources.length})
                  </h4>
                  <div className="space-y-1.5">
                    {displayedSources?.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{extractDomain(url)}</span>
                      </a>
                    ))}
                  </div>
                  {research.relevantSources.length > 5 && (
                    <button
                      onClick={() => setShowAllSources(!showAllSources)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showAllSources ? 'Show less' : `Show all ${research.relevantSources.length} sources`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Citation badge component
function CitationBadge({ citation }: { citation: Citation }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Globe className="w-3 h-3" />
        <span className="truncate max-w-[120px]">{citation.title || extractDomain(citation.url)}</span>
      </a>

      {showTooltip && citation.citedText && (
        <div className="absolute z-10 bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-xs">
          <p className="line-clamp-3">{citation.citedText}</p>
        </div>
      )}
    </div>
  )
}

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

export default ResearchPanel
