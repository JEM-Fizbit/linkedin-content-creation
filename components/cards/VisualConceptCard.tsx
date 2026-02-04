'use client'

import { useState } from 'react'
import { Check, Pencil, Trash2, Sparkles, RefreshCw, X, Save } from 'lucide-react'
import type { VisualConcept } from '@/types'

interface VisualConceptCardProps {
  index: number
  concept: VisualConcept
  isSelected: boolean
  onSelect: () => void
  onEdit: (newDescription: string) => void
  onDelete: () => void
  onGenerate: () => void
  isGenerating: boolean
}

export function VisualConceptCard({
  index,
  concept,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onGenerate,
  isGenerating,
}: VisualConceptCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(concept.description)

  const handleSave = () => {
    if (editValue.trim()) {
      onEdit(editValue.trim())
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditValue(concept.description)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div
      className={`
        relative group rounded-xl border-2 overflow-hidden transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Selection indicator */}
      <button
        onClick={onSelect}
        className={`
          absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
          ${isSelected
            ? 'border-blue-500 bg-blue-500'
            : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 hover:border-blue-400'
          }
        `}
      >
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </button>

      {/* Index badge */}
      <div className="absolute top-3 right-3 z-10 px-2 py-1 text-xs font-medium bg-gray-500/80 text-white rounded">
        #{index + 1}
      </div>

      {/* Card content */}
      <div className="p-4 pt-12 min-h-[180px] flex flex-col">
        {isEditing ? (
          <div className="flex-1 flex flex-col">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your image concept..."
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!editValue.trim()}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Concept description */}
            <div className="flex-1">
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {concept.description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Edit prompt"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
