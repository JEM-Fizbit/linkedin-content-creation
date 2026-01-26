'use client'

import { useState } from 'react'
import { FileText, File, Link, X, Loader2 } from 'lucide-react'

interface SourceItemProps {
  id: string
  type: 'text' | 'file' | 'url'
  title: string
  wordCount: number
  enabled: boolean
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  onPreview: (id: string) => void
}

const TYPE_ICONS = {
  text: FileText,
  file: File,
  url: Link,
}

export function SourceItem({ id, type, title, wordCount, enabled, onToggle, onDelete, onPreview }: SourceItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const Icon = TYPE_ICONS[type]

  const handleToggle = async () => {
    setIsToggling(true)
    await onToggle(id, !enabled)
    setIsToggling(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(id)
  }

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
        enabled
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 opacity-60'
      }`}
    >
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />

      <button
        onClick={() => onPreview(id)}
        className="flex-1 min-w-0 text-left group"
      >
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </span>
      </button>

      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 tabular-nums">
        {wordCount.toLocaleString()} words
      </span>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
            enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          role="switch"
          aria-checked={enabled}
          title={enabled ? 'Disable source' : 'Enable source'}
        >
          {isToggling ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
            </span>
          ) : (
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          )}
        </button>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
          title="Remove source"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
