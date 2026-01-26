'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Download,
  FileImage,
  Wand2,
  Eye,
  Image as ImageIcon,
  RefreshCw,
  Upload
} from 'lucide-react'
import type { CarouselSlide, CarouselTemplate, TextZone } from '@/types'

interface CarouselEditorProps {
  projectId: string
  carousel: {
    id: string
    slides: CarouselSlide[]
    template_id?: string
  } | null
  template?: CarouselTemplate | null
  onUpdate: (slides: CarouselSlide[]) => void
  onGenerate: () => Promise<void>
  onRender: () => Promise<void>
  onExport: (format: 'pdf' | 'png-zip') => Promise<void>
  isLoading?: boolean
}

export default function CarouselEditor({
  projectId,
  carousel,
  template,
  onUpdate,
  onGenerate,
  onRender,
  onExport,
  isLoading = false
}: CarouselEditorProps) {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const slidesContainerRef = useRef<HTMLDivElement>(null)

  const slides = carousel?.slides || []
  const selectedSlide = slides[selectedSlideIndex]

  const handleSlideEdit = useCallback((index: number, field: keyof CarouselSlide, value: string) => {
    const updatedSlides = [...slides]
    updatedSlides[index] = {
      ...updatedSlides[index],
      [field]: value
    }
    onUpdate(updatedSlides)
  }, [slides, onUpdate])

  const handleAddSlide = useCallback(() => {
    const newSlide: CarouselSlide = {
      id: `slide-${Date.now()}`,
      position: slides.length,
      headline: 'New slide headline',
      body: 'Add your content here'
    }
    onUpdate([...slides, newSlide])
    setSelectedSlideIndex(slides.length)
  }, [slides, onUpdate])

  const handleDeleteSlide = useCallback((index: number) => {
    if (slides.length <= 1) return

    const updatedSlides = slides.filter((_, i) => i !== index)
      .map((slide, i) => ({ ...slide, position: i }))

    onUpdate(updatedSlides)

    if (selectedSlideIndex >= updatedSlides.length) {
      setSelectedSlideIndex(updatedSlides.length - 1)
    }
  }, [slides, selectedSlideIndex, onUpdate])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const updatedSlides = [...slides]
    const [draggedSlide] = updatedSlides.splice(draggedIndex, 1)
    updatedSlides.splice(dropIndex, 0, draggedSlide)

    // Update positions
    const reorderedSlides = updatedSlides.map((slide, i) => ({
      ...slide,
      position: i
    }))

    onUpdate(reorderedSlides)
    setSelectedSlideIndex(dropIndex)
    setDraggedIndex(null)
  }

  const navigateSlide = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedSlideIndex > 0) {
      setSelectedSlideIndex(selectedSlideIndex - 1)
    } else if (direction === 'next' && selectedSlideIndex < slides.length - 1) {
      setSelectedSlideIndex(selectedSlideIndex + 1)
    }
  }

  // Handle keyboard navigation in preview mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPreviewMode) return

      if (e.key === 'ArrowLeft') {
        navigateSlide('prev')
      } else if (e.key === 'ArrowRight') {
        navigateSlide('next')
      } else if (e.key === 'Escape') {
        setIsPreviewMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPreviewMode, selectedSlideIndex])

  // Empty state
  if (!carousel || slides.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <div className="max-w-md mx-auto">
          <FileImage className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Carousel Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Generate a carousel from your content or import a template to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onGenerate}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Generate from Content
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Preview mode
  if (isPreviewMode) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <button
          onClick={() => setIsPreviewMode(false)}
          className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg"
        >
          <span className="sr-only">Close preview</span>
          &times;
        </button>

        {/* Navigation */}
        <button
          onClick={() => navigateSlide('prev')}
          disabled={selectedSlideIndex === 0}
          className="absolute left-4 p-3 text-white hover:bg-white/10 rounded-lg disabled:opacity-30"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <button
          onClick={() => navigateSlide('next')}
          disabled={selectedSlideIndex === slides.length - 1}
          className="absolute right-4 p-3 text-white hover:bg-white/10 rounded-lg disabled:opacity-30"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        {/* Slide */}
        <div className="w-full max-w-2xl aspect-square mx-4">
          {selectedSlide.rendered_image ? (
            <img
              src={`data:image/png;base64,${selectedSlide.rendered_image}`}
              alt={`Slide ${selectedSlideIndex + 1}`}
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 rounded-lg flex flex-col items-center justify-center p-8">
              <h2 className="text-3xl font-bold text-white text-center mb-4">
                {selectedSlide.headline}
              </h2>
              {selectedSlide.body && (
                <p className="text-xl text-gray-300 text-center">
                  {selectedSlide.body}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Slide indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setSelectedSlideIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === selectedSlideIndex ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Regenerate
          </button>
          <button
            onClick={onRender}
            disabled={isLoading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Render Slides
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewMode(true)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => onExport('pdf')}
            disabled={isLoading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => onExport('png-zip')}
            disabled={isLoading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            PNG ZIP
          </button>
        </div>
      </div>

      {/* Slide Strip */}
      <div
        ref={slidesContainerRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => setSelectedSlideIndex(index)}
            className={`relative flex-shrink-0 w-40 aspect-square rounded-lg border-2 cursor-pointer transition-all group ${
              selectedSlideIndex === index
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            } ${draggedIndex === index ? 'opacity-50' : ''}`}
          >
            {/* Slide Preview */}
            {slide.rendered_image ? (
              <img
                src={`data:image/png;base64,${slide.rendered_image}`}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-md flex flex-col items-center justify-center p-2 text-center">
                <span className="text-xs font-medium text-gray-600 line-clamp-3">
                  {slide.headline}
                </span>
              </div>
            )}

            {/* Slide number */}
            <div className="absolute top-1 left-1 w-5 h-5 bg-black/60 text-white text-xs rounded flex items-center justify-center">
              {index + 1}
            </div>

            {/* Drag handle */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            {/* Delete button */}
            {slides.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteSlide(index)
                }}
                className="absolute bottom-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* Add Slide Button */}
        <button
          onClick={handleAddSlide}
          className="flex-shrink-0 w-40 aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-600 transition-colors"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs">Add Slide</span>
        </button>
      </div>

      {/* Selected Slide Editor */}
      {selectedSlide && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-white shadow-sm">
              {selectedSlide.rendered_image ? (
                <img
                  src={`data:image/png;base64,${selectedSlide.rendered_image}`}
                  alt={`Slide ${selectedSlideIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {selectedSlide.headline}
                  </h3>
                  {selectedSlide.body && (
                    <p className="text-gray-600">
                      {selectedSlide.body}
                    </p>
                  )}
                  {!selectedSlide.rendered_image && (
                    <p className="text-xs text-gray-400 mt-4">
                      Click &quot;Render Slides&quot; to generate final images
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={selectedSlide.headline}
                onChange={(e) => handleSlideEdit(selectedSlideIndex, 'headline', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter headline..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body Text
              </label>
              <textarea
                value={selectedSlide.body || ''}
                onChange={(e) => handleSlideEdit(selectedSlideIndex, 'body', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter body text..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CTA (optional)
              </label>
              <input
                type="text"
                value={selectedSlide.cta || ''}
                onChange={(e) => handleSlideEdit(selectedSlideIndex, 'cta', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Follow for more..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visual Prompt (for AI image)
              </label>
              <textarea
                value={selectedSlide.visual_prompt || ''}
                onChange={(e) => handleSlideEdit(selectedSlideIndex, 'visual_prompt', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                placeholder="Describe the visual for AI image generation..."
              />
            </div>

            {/* Background Color (for slides without template) */}
            {!template && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedSlide.background_color || '#ffffff'}
                    onChange={(e) => handleSlideEdit(selectedSlideIndex, 'background_color', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedSlide.background_color || '#ffffff'}
                    onChange={(e) => handleSlideEdit(selectedSlideIndex, 'background_color', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
