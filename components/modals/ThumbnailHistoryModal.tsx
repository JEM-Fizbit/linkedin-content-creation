'use client'

import { useState, useEffect } from 'react'
import { X, Clock, Check } from 'lucide-react'
import Image from 'next/image'
import type { GeneratedImage } from '@/types'

interface ThumbnailHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentImageId?: string
  onUseVersion: (imageId: string) => void
}

export function ThumbnailHistoryModal({
  isOpen,
  onClose,
  projectId,
  currentImageId,
  onUseVersion,
}: ThumbnailHistoryModalProps) {
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchImages()
    }
  }, [isOpen, projectId])

  const fetchImages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/images/generate?project_id=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setImages(data)
      }
    } catch (error) {
      console.error('Failed to fetch images:', error)
    } finally {
      setIsLoading(false)
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Thumbnail History
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                All generated thumbnails for this project
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
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No thumbnails generated yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image, idx) => {
                const isCurrent = image.id === currentImageId
                return (
                  <div
                    key={image.id}
                    className={`
                      relative rounded-xl overflow-hidden border-2 transition-all
                      ${isCurrent
                        ? 'border-blue-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    {/* Image */}
                    <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
                      <Image
                        src={image.image_data ? `data:image/png;base64,${image.image_data}` : image.image_url || ''}
                        alt={image.prompt}
                        fill
                        className="object-cover"
                      />

                      {/* Current badge */}
                      {isCurrent && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Current
                        </div>
                      )}

                      {/* Version number */}
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                        v{images.length - idx}
                      </div>

                      {/* 4K badge */}
                      {image.is_upscaled && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
                          4K
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 bg-white dark:bg-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                        {image.prompt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(image.created_at)}
                        </span>
                        {!isCurrent && (
                          <button
                            onClick={() => {
                              onUseVersion(image.id)
                              onClose()
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Use This
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ThumbnailHistoryModal
