'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  FileImage,
  File,
  X,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import type { CarouselTemplate } from '@/types'

interface TemplateImporterProps {
  projectId: string
  onImported: (template: CarouselTemplate) => void
  onCancel?: () => void
}

interface SelectedFile {
  file: File
  preview?: string
}

export default function TemplateImporter({
  projectId,
  onImported,
  onCancel
}: TemplateImporterProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [templateName, setTemplateName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const newFiles: SelectedFile[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.toLowerCase().split('.').pop()
      const isPdf = file.type === 'application/pdf' || ext === 'pdf'
      const isZip = file.type === 'application/zip' || ext === 'zip'
      const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(ext || '')

      if (isPdf || isZip || isImage) {
        // Create preview for images
        let preview: string | undefined
        if (isImage) {
          preview = URL.createObjectURL(file)
        }

        newFiles.push({ file, preview })
      }
    }

    if (newFiles.length === 0) {
      setError('Please select PDF, ZIP, PNG, or JPG files')
      return
    }

    setSelectedFiles(prev => [...prev, ...newFiles])
    setError(null)

    // Auto-generate template name from first file if empty
    if (!templateName && newFiles.length > 0) {
      const firstName = newFiles[0].file.name
        .replace(/\.[^.]+$/, '') // Remove extension
        .replace(/[-_]/g, ' ')  // Replace dashes/underscores with spaces
      setTemplateName(firstName)
    }
  }, [templateName])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const updated = [...prev]
      // Revoke object URL if it exists
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!)
      }
      updated.splice(index, 1)
      return updated
    })
  }, [])

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file')
      return
    }

    if (!templateName.trim()) {
      setError('Please enter a template name')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Convert files to base64
      const filesData = await Promise.all(
        selectedFiles.map(async ({ file }) => {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          return {
            filename: file.name,
            data: base64,
            mime_type: file.type || 'application/octet-stream'
          }
        })
      )

      const response = await fetch('/api/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: templateName.trim(),
          files: filesData
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import template')
      }

      const template = await response.json()

      // Clean up previews
      selectedFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview)
      })

      onImported(template)

    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to import template')
    } finally {
      setIsUploading(false)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return FileImage
    return File
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Import Template</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Template Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template Name
        </label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="My Carousel Template"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.zip,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf,application/zip"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
        />

        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-gray-600 mb-1">
          Drop files here or <span className="text-blue-600">browse</span>
        </p>
        <p className="text-sm text-gray-500">
          Supports PDF, ZIP, PNG, and JPG files
        </p>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected files ({selectedFiles.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {selectedFiles.map((sf, index) => {
              const Icon = getFileIcon(sf.file)
              return (
                <div
                  key={index}
                  className="relative group border rounded-lg p-2 bg-gray-50"
                >
                  {sf.preview ? (
                    <img
                      src={sf.preview}
                      alt={sf.file.name}
                      className="w-full aspect-square object-cover rounded"
                    />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-gray-100 rounded">
                      <Icon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <p className="text-xs text-gray-600 truncate mt-1" title={sf.file.name}>
                    {sf.file.name}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleImport}
          disabled={isUploading || selectedFiles.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Import Template
            </>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 pt-4 border-t">
        <p className="text-sm font-medium text-gray-700 mb-2">How to prepare your template:</p>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Design your carousel slides in Canva (or another design tool)</li>
          <li>Export as multi-page PDF or individual PNG files</li>
          <li>Upload here and define text zones for AI-generated content</li>
          <li>Generate content and export your finished carousel</li>
        </ol>
      </div>
    </div>
  )
}
