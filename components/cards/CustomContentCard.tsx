'use client'

import { useState } from 'react'
import { Plus, Check, X, Pencil } from 'lucide-react'

interface CustomContentCardProps {
  onSave: (content: string) => void
  placeholder?: string
  label?: string
}

export function CustomContentCard({
  onSave,
  placeholder = 'Write your own content...',
  label = 'Write Your Own',
}: CustomContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [content, setContent] = useState('')

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim())
      setContent('')
      setIsExpanded(false)
    }
  }

  const handleCancel = () => {
    setContent('')
    setIsExpanded(false)
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full h-full min-h-[120px] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex flex-col items-center justify-center gap-2 group"
      >
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-colors">
          <Pencil className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {label}
        </span>
      </button>
    )
  }

  return (
    <div className="rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          {label}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={4}
        autoFocus
      />
      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!content.trim()}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Check className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  )
}

interface SkipOptionCardProps {
  isSelected: boolean
  onSelect: () => void
  label?: string
  description?: string
}

export function SkipOptionCard({
  isSelected,
  onSelect,
  label = 'Skip this step',
  description = 'Continue without adding content for this section',
}: SkipOptionCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full min-h-[120px] rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 p-4
        ${isSelected
          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-300 dark:hover:border-amber-700'
        }
      `}
    >
      <div className={`
        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
        ${isSelected
          ? 'border-amber-500 bg-amber-500'
          : 'border-gray-300 dark:border-gray-600'
        }
      `}>
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>
      <span className={`
        text-sm font-medium
        ${isSelected
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-gray-600 dark:text-gray-400'
        }
      `}>
        {label}
      </span>
      <span className={`
        text-xs text-center
        ${isSelected
          ? 'text-amber-600 dark:text-amber-500'
          : 'text-gray-500 dark:text-gray-500'
        }
      `}>
        {description}
      </span>
    </button>
  )
}

export default CustomContentCard
