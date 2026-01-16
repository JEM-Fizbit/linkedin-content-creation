'use client'

import { useState } from 'react'
import { X, Loader2, ArrowRight, Maximize2 } from 'lucide-react'
import Image from 'next/image'

interface UpscaleModalProps {
  isOpen: boolean
  onClose: () => void
  currentImage: {
    id: string
    url: string
    width: number
    height: number
  }
  onUpscale: () => Promise<void>
}

export function UpscaleModal({
  isOpen,
  onClose,
  currentImage,
  onUpscale,
}: UpscaleModalProps) {
  const [isUpscaling, setIsUpscaling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetWidth = 3840
  const targetHeight = 2160

  const handleUpscale = async () => {
    setIsUpscaling(true)
    setError(null)
    try {
      await onUpscale()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upscale image')
    } finally {
      setIsUpscaling(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Maximize2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upscale to 4K
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Increase image resolution
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
        <div className="p-6 space-y-6">
          {/* Current Image Preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
            <Image
              src={currentImage.url}
              alt="Current image"
              fill
              className="object-cover"
            />
          </div>

          {/* Resolution Comparison */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentImage.width}×{currentImage.height}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                Current
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-green-500" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {targetWidth}×{targetHeight}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                Target (4K UHD)
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Upscaling will create a higher resolution version while preserving image quality.
              This process may take a few moments.
            </p>
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
            onClick={handleUpscale}
            disabled={isUpscaling}
            className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUpscaling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Upscaling...
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                Upscale to 4K
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UpscaleModal
