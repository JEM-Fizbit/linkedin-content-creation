'use client'

import { useState, useEffect } from 'react'
import { X, Linkedin, Youtube, Facebook, Globe, Search } from 'lucide-react'
import type { Platform, CreateProjectRequest } from '@/types'

interface ProjectFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateProjectRequest) => void
  initialData?: Partial<CreateProjectRequest>
  title?: string
  submitLabel?: string
}

const PLATFORMS: { value: Platform; label: string; icon: typeof Linkedin }[] = [
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
]

export function ProjectForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = 'Create New Project',
  submitLabel = 'Create Project',
}: ProjectFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [topic, setTopic] = useState(initialData?.topic || '')
  const [targetAudience, setTargetAudience] = useState(initialData?.target_audience || '')
  const [contentStyle, setContentStyle] = useState(initialData?.content_style || '')
  const [platform, setPlatform] = useState<Platform>(initialData?.platform || 'linkedin')
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when initialData changes (e.g., when opening for edit)
  useEffect(() => {
    setName(initialData?.name || '')
    setTopic(initialData?.topic || '')
    setTargetAudience(initialData?.target_audience || '')
    setContentStyle(initialData?.content_style || '')
    setPlatform(initialData?.platform || 'linkedin')
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !topic.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        topic: topic.trim(),
        target_audience: targetAudience.trim(),
        content_style: contentStyle.trim(),
        platform,
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Platform
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PLATFORMS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPlatform(value)}
                  className={`
                    flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                    ${platform === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q1 Product Launch Campaign"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Topic */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content Topic *
            </label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is your content about? Be specific..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Target Audience */}
          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Audience
            </label>
            <input
              id="audience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., B2B enterprise decision makers, startup founders"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Content Style */}
          <div>
            <label htmlFor="style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content Style/Tone
            </label>
            <input
              id="style"
              type="text"
              value={contentStyle}
              onChange={(e) => setContentStyle(e.target.value)}
              placeholder="e.g., Professional but approachable, thought leadership"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Web Research Toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <label htmlFor="webSearch" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Web Research
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Search the web for current information when generating content
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={webSearchEnabled}
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${webSearchEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}
              `}
            >
              <span
                aria-hidden="true"
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                  transition duration-200 ease-in-out
                  ${webSearchEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !topic.trim()}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectForm
