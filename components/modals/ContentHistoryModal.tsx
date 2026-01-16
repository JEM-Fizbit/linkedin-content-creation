'use client'

import { useState, useEffect } from 'react'
import { X, Clock, User, Bot, Check } from 'lucide-react'
import type { ContentVersion } from '@/types'

interface ContentHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  contentType: string
  contentIndex: number
  currentContent: string
  originalContent: string
  onUseVersion: (content: string) => void
}

export function ContentHistoryModal({
  isOpen,
  onClose,
  projectId,
  contentType,
  contentIndex,
  currentContent,
  originalContent,
  onUseVersion,
}: ContentHistoryModalProps) {
  const [versions, setVersions] = useState<ContentVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchVersions()
    }
  }, [isOpen, projectId, contentType, contentIndex])

  const fetchVersions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        project_id: projectId,
        content_type: contentType,
        content_index: contentIndex.toString(),
      })
      const response = await fetch(`/api/content-versions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data)
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseVersion = (content: string) => {
    onUseVersion(content)
    onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Version History
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {contentType.charAt(0).toUpperCase() + contentType.slice(1)} #{contentIndex + 1}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Current version */}
              <div className="rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded">
                      Current
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
                  {currentContent}
                </p>
              </div>

              {/* Version history */}
              {versions.map((version, idx) => (
                <div
                  key={version.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {version.edited_by === 'assistant' ? (
                        <Bot className="w-4 h-4 text-purple-500" />
                      ) : (
                        <User className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {version.edited_by === 'assistant' ? 'AI Edit' : 'Your Edit'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(version.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUseVersion(version.old_content)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      Use This
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Previous version:</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
                    {version.old_content}
                  </p>
                </div>
              ))}

              {/* Original version (if different from current) */}
              {originalContent && originalContent !== currentContent && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-500 text-white rounded">
                        Original
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        AI Generated
                      </span>
                    </div>
                    <button
                      onClick={() => handleUseVersion(originalContent)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      Revert to Original
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
                    {originalContent}
                  </p>
                </div>
              )}

              {versions.length === 0 && originalContent === currentContent && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No edit history yet</p>
                  <p className="text-sm mt-1">Changes will appear here when you edit this content</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContentHistoryModal
