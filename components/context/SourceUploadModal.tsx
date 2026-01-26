'use client'

import { useState, useRef, useCallback } from 'react'
import { X, FileText, Upload, Link, Loader2, AlertCircle } from 'lucide-react'

interface SourceUploadModalProps {
  projectId: string
  onClose: () => void
  onSourceAdded: () => void
}

type Tab = 'text' | 'file' | 'url'

export function SourceUploadModal({ projectId, onClose, onSourceAdded }: SourceUploadModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('text')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Text tab state
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')

  // File tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // URL tab state
  const [urlInput, setUrlInput] = useState('')

  const handleSubmitText = async () => {
    if (!textTitle.trim() || !textContent.trim()) {
      setError('Both title and content are required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          type: 'text',
          title: textTitle.trim(),
          content: textContent.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create source')
      }

      onSourceAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitFile = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Read file as base64
      const base64Data = await fileToBase64(selectedFile)

      // Extract text content from file
      const extractResponse = await fetch('/api/sources/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'file',
          filename: selectedFile.name,
          mime_type: selectedFile.type,
          data: base64Data,
        }),
      })

      if (!extractResponse.ok) {
        const data = await extractResponse.json()
        throw new Error(data.error || 'Failed to extract text from file')
      }

      const extracted = await extractResponse.json()

      // Save the extracted source
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          type: 'file',
          title: extracted.title,
          content: extracted.content,
          original_filename: selectedFile.name,
          mime_type: selectedFile.type,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save source')
      }

      onSourceAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitUrl = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a URL')
      return
    }

    // Basic URL validation
    try {
      new URL(urlInput.trim())
    } catch {
      setError('Please enter a valid URL')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Extract text content from URL
      const extractResponse = await fetch('/api/sources/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url',
          url: urlInput.trim(),
        }),
      })

      if (!extractResponse.ok) {
        const data = await extractResponse.json()
        throw new Error(data.error || 'Failed to fetch URL content')
      }

      const extracted = await extractResponse.json()

      // Save the extracted source
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          type: 'url',
          title: extracted.title,
          content: extracted.content,
          original_url: urlInput.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save source')
      }

      onSourceAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import URL')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && isAcceptedFileType(file)) {
      setSelectedFile(file)
      setError(null)
    } else {
      setError('Unsupported file type. Please use .txt, .md, or .pdf')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'text', label: 'Paste Text', icon: FileText },
    { id: 'file', label: 'Upload File', icon: Upload },
    { id: 'url', label: 'Import URL', icon: Link },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Information Source
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(null) }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Paste Text */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Source title (e.g., Product Brief, Key Points)"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <textarea
                placeholder="Paste your content here — notes, article text, research findings, talking points..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>
          )}

          {/* Upload File */}
          {activeTab === 'file' && (
            <div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : selectedFile
                      ? 'border-green-300 bg-green-50 dark:bg-green-900/10 dark:border-green-700'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {selectedFile ? (
                  <div>
                    <FileText className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatFileSize(selectedFile.size)}</p>
                    <p className="text-xs text-blue-500 mt-2">Click to choose a different file</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Drop a file here or <span className="text-blue-500 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Supports .txt, .md, .pdf</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Import URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <input
                type="url"
                placeholder="https://example.com/article"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-400">
                We&apos;ll fetch the page and extract the main text content.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={
              activeTab === 'text' ? handleSubmitText :
              activeTab === 'file' ? handleSubmitFile :
              handleSubmitUrl
            }
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Processing...' : 'Add Source'}
          </button>
        </div>
      </div>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data:...;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function isAcceptedFileType(file: File): boolean {
  const ext = file.name.toLowerCase().split('.').pop()
  return ['txt', 'md', 'pdf'].includes(ext || '')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
