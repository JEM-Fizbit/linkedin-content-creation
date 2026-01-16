'use client'

import { useState } from 'react'
import { Check, Copy, Edit2, Trash2, RotateCcw, X, Globe, ExternalLink, History } from 'lucide-react'
import type { Citation } from '@/types'

interface ContentCardProps {
  index: number
  content: string
  isSelected?: boolean
  isEdited?: boolean
  originalContent?: string
  onSelect?: () => void
  onEdit?: (newContent: string) => void
  onDelete?: () => void
  onRevert?: () => void
  onCopy?: () => void
  onHistory?: () => void
  showIndex?: boolean
  maxLines?: number
  citations?: Citation[]
}

export function ContentCard({
  index,
  content,
  isSelected = false,
  isEdited = false,
  originalContent,
  onSelect,
  onEdit,
  onDelete,
  onRevert,
  onCopy,
  onHistory,
  showIndex = true,
  maxLines,
  citations = [],
}: ContentCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(content)
  const [copied, setCopied] = useState(false)

  const handleStartEdit = () => {
    setEditValue(content)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (editValue.trim() !== content) {
      onEdit?.(editValue.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditValue(content)
    setIsEditing(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }

  const canRevert = isEdited && originalContent && originalContent !== content

  return (
    <div
      className={`
        relative group rounded-xl border-2 transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Selection indicator */}
      {onSelect && (
        <button
          onClick={onSelect}
          className={`
            absolute top-3 left-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
            ${isSelected
              ? 'border-blue-500 bg-blue-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
            }
          `}
        >
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </button>
      )}

      {/* Index badge */}
      {showIndex && (
        <div className="absolute top-3 right-3 text-xs font-medium text-gray-400 dark:text-gray-500">
          #{index + 1}
        </div>
      )}

      {/* Edited badge */}
      {isEdited && (
        <div className="absolute top-3 right-10 px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
          Edited
        </div>
      )}

      {/* Content */}
      <div className={`p-4 ${onSelect ? 'pl-12' : ''} ${showIndex ? 'pr-16' : ''}`}>
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={maxLines || 4}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p
              className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap ${maxLines ? `line-clamp-${maxLines}` : ''}`}
            >
              {content}
            </p>

            {/* Citations */}
            {citations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{citations.length} source{citations.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {citations.slice(0, 3).map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title={citation.title || citation.url}
                    >
                      {extractDomain(citation.url)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                  {citations.length > 3 && (
                    <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                      +{citations.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {onEdit && (
            <button
              onClick={handleStartEdit}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {onHistory && (
            <button
              onClick={onHistory}
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="View history"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {canRevert && onRevert && (
            <button
              onClick={onRevert}
              className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Revert to original"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
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

export default ContentCard
