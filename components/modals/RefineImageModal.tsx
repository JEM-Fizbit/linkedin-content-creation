'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface RefineImageModalProps {
  isOpen: boolean
  onClose: () => void
  currentImage: {
    id: string
    url: string
    prompt: string
  }
  onRefine: (refinementPrompt: string) => Promise<void>
}

export function RefineImageModal({
  isOpen,
  onClose,
  currentImage,
  onRefine,
}: RefineImageModalProps) {
  const [refinementPrompt, setRefinementPrompt] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRefine = async () => {
    if (!refinementPrompt.trim()) return

    setIsRefining(true)
    setError(null)
    try {
      await onRefine(refinementPrompt.trim())
      setRefinementPrompt('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine image')
    } finally {
      setIsRefining(false)
    }
  }

  const suggestions = [
    'Change the text to say "NEW VIDEO"',
    'Make the colors more vibrant',
    'Add a subtle gradient background',
    'Make the subject larger',
    'Add a border or frame',
    'Change the expression to more excited',
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Refine Image
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Describe what you want to change
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
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Current Image Preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
            <Image
              src={currentImage.url}
              alt="Current image"
              fill
              className="object-cover"
            />
          </div>

          {/* Original Prompt */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Original Prompt</div>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              {currentImage.prompt}
            </p>
          </div>

          {/* Refinement Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What would you like to change?
            </label>
            <textarea
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="e.g., Make the text bigger, change colors, adjust composition..."
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              autoFocus
            />
          </div>

          {/* Quick Suggestions */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Quick suggestions</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setRefinementPrompt(suggestion)}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRefine}
            disabled={!refinementPrompt.trim() || isRefining}
            className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRefining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refining...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Refine Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RefineImageModal
