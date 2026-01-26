'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface ReferenceImageItemProps {
  id: string
  filename: string
  type: string
  thumbnailUrl: string
  onDelete: (id: string) => void
}

export function ReferenceImageItem({ id, filename, type, thumbnailUrl, onDelete }: ReferenceImageItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(id)
  }

  const typeLabel = type.replace('_', ' ')

  return (
    <div className="relative group">
      <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={filename}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Type badge */}
      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/60 text-white rounded">
        {typeLabel}
      </span>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        title="Remove image"
      >
        {isDeleting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <X className="w-3 h-3" />
        )}
      </button>

      {/* Filename tooltip on hover */}
      <div className="absolute -bottom-6 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate block">
          {filename}
        </span>
      </div>
    </div>
  )
}
