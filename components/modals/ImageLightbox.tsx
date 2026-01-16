'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Download, Sparkles, ZoomIn, ZoomOut } from 'lucide-react'
import type { GeneratedImage } from '@/types'

interface ImageLightboxProps {
  images: GeneratedImage[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onRefine?: (image: GeneratedImage) => void
  onUpscale?: (image: GeneratedImage) => void
  onDownload?: (image: GeneratedImage) => void
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onRefine,
  onUpscale,
  onDownload,
}: ImageLightboxProps) {
  const currentImage = images[currentIndex]

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowLeft':
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1)
        }
        break
      case 'ArrowRight':
        if (currentIndex < images.length - 1) {
          onNavigate(currentIndex + 1)
        }
        break
    }
  }, [isOpen, currentIndex, images.length, onClose, onNavigate])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !currentImage) return null

  const imageSrc = currentImage.image_data
    ? `data:image/png;base64,${currentImage.image_data}`
    : currentImage.image_url || ''

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white">
          <span className="text-sm opacity-75">
            {currentIndex + 1} of {images.length}
          </span>
          {currentImage.is_upscaled && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-green-500 rounded">4K</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefine && (
            <button
              onClick={() => onRefine(currentImage)}
              className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Refine image"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}

          {onUpscale && !currentImage.is_upscaled && (
            <button
              onClick={() => onUpscale(currentImage)}
              className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Upscale to 4K"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          )}

          {onDownload && (
            <button
              onClick={() => onDownload(currentImage)}
              className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="absolute inset-0 flex items-center justify-center p-16">
        <div className="relative w-full h-full">
          <Image
            src={imageSrc}
            alt={currentImage.prompt || 'Generated image'}
            fill
            className="object-contain"
            quality={100}
          />
        </div>
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/75 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/75 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Prompt */}
      {currentImage.prompt && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <p className="text-white/75 text-sm max-w-2xl mx-auto text-center line-clamp-2">
            {currentImage.prompt}
          </p>
        </div>
      )}
    </div>
  )
}

export default ImageLightbox
