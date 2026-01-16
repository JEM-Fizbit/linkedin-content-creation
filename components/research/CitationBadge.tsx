'use client'

import { Globe, ExternalLink } from 'lucide-react'
import type { Citation } from '@/types'

interface CitationBadgeProps {
  citation: Citation
  size?: 'sm' | 'md'
}

export function CitationBadge({ citation, size = 'sm' }: CitationBadgeProps) {
  const domain = extractDomain(citation.url)

  if (size === 'sm') {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title={citation.title || domain}
      >
        <Globe className="w-3 h-3" />
        <span className="truncate max-w-[80px]">{domain}</span>
      </a>
    )
  }

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      title={citation.citedText || citation.title}
    >
      <Globe className="w-3 h-3" />
      <span className="truncate max-w-[120px]">{citation.title || domain}</span>
      <ExternalLink className="w-3 h-3" />
    </a>
  )
}

interface CitationListProps {
  citations: Citation[]
  maxVisible?: number
  size?: 'sm' | 'md'
}

export function CitationList({ citations, maxVisible = 3, size = 'sm' }: CitationListProps) {
  if (!citations || citations.length === 0) return null

  const visibleCitations = citations.slice(0, maxVisible)
  const remainingCount = citations.length - maxVisible

  return (
    <div className="flex items-center flex-wrap gap-1">
      {visibleCitations.map((citation, index) => (
        <CitationBadge key={index} citation={citation} size={size} />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          +{remainingCount} more
        </span>
      )}
    </div>
  )
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

export default CitationBadge
