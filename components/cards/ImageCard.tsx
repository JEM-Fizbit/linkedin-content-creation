'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Download, Expand, RefreshCw, Sparkles, Trash2, Eye, Copy, Clock } from 'lucide-react'
import type { GeneratedImage, VisualConcept } from '@/types'

interface ImageCardProps {
  index: number
  image?: GeneratedImage
  concept?: VisualConcept
  isSelected?: boolean
  onSelect?: () => void
  onDelete?: () => void
  onRefine?: () => void
  onUpscale?: () => void
  onViewFullScreen?: () => void
  onDownload?: () => void
  onGenerate?: () => void
  onCopy?: () => void
  onHistory?: () => void
  isGenerating?: boolean
  showPrompt?: boolean
}

export function ImageCard({
  index,
  image,
  concept,
  isSelected = false,
  onSelect,
  onDelete,
  onRefine,
  onUpscale,
  onViewFullScreen,
  onDownload,
  onGenerate,
  onCopy,
  onHistory,
  isGenerating = false,
  showPrompt = false,
}: ImageCardProps) {
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (image?.image_data) {
      try {
        // Create blob from base64
        const response = await fetch(`data:image/png;base64,${image.image_data}`)
        const blob = await response.blob()
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        onCopy?.()
      } catch (err) {
        console.error('Failed to copy image:', err)
      }
    }
  }

  const hasImage = image?.image_data || image?.image_url
  const displayDescription = concept?.description || image?.prompt || ''

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
      {onSelect && (
        <button
          onClick={onSelect}
          className={`
            absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
            ${isSelected
              ? 'border-blue-500 bg-blue-500'
              : 'border-white bg-black/30 hover:border-blue-400'
            }
          `}
        >
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </button>
      )}

      {/* Index badge */}
      <div className="absolute top-3 right-3 z-10 px-2 py-1 text-xs font-medium bg-black/50 text-white rounded">
        #{index + 1}
      </div>

      {/* Upscaled badge */}
      {image?.is_upscaled && (
        <div className="absolute top-10 right-3 z-10 px-2 py-0.5 text-xs font-medium bg-green-500 text-white rounded">
          4K
        </div>
      )}

      {/* Image or Placeholder */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
        {hasImage ? (
          <Image
            src={image?.image_data ? `data:image/png;base64,${image.image_data}` : image?.image_url || ''}
            alt={displayDescription}
            fill
            className="object-cover"
          />
        ) : concept ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <Sparkles className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-200 line-clamp-3">
              {displayDescription}
            </p>
            {onGenerate && (
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Image
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}

        {/* Loading overlay */}
        {isGenerating && hasImage && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Actions */}
      {hasImage && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {showPrompt && (
            <button
              onClick={() => setShowPromptModal(true)}
              className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="View prompt"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {onViewFullScreen && (
            <button
              onClick={onViewFullScreen}
              className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="View full screen"
            >
              <Expand className="w-4 h-4" />
            </button>
          )}

          {image?.image_data && (
            <button
              onClick={handleCopy}
              className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}

          {onRefine && (
            <button
              onClick={onRefine}
              className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Refine image"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {onHistory && (
            <button
              onClick={onHistory}
              className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="View history"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}

          {onUpscale && !image?.is_upscaled && (
            <button
              onClick={onUpscale}
              className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Upscale to 4K"
            >
              <span className="text-xs font-bold">4K</span>
            </button>
          )}

          {onDownload && (
            <button
              onClick={onDownload}
              className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Prompt Modal */}
      {showPromptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowPromptModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Image Prompt
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {image?.prompt || concept?.description}
            </p>
            <button
              onClick={() => setShowPromptModal(false)}
              className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageCard
