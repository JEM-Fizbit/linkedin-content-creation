'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Linkedin, Youtube, Facebook } from 'lucide-react'
import type { Platform, CreateProjectRequest } from '@/types'

const PLATFORMS: { value: Platform; label: string; icon: typeof Linkedin; description: string }[] = [
  {
    value: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    description: 'Professional posts with hooks, body content, CTAs, and visuals'
  },
  {
    value: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    description: 'Video content with hooks, intros, titles, and thumbnails'
  },
  {
    value: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    description: 'Social posts with hooks, body content, CTAs, and visuals'
  },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [contentStyle, setContentStyle] = useState('')
  const [platform, setPlatform] = useState<Platform>('linkedin')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !topic.trim()) {
      setError('Project name and topic are required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          topic: topic.trim(),
          target_audience: targetAudience.trim(),
          content_style: contentStyle.trim(),
          platform,
        } as CreateProjectRequest),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create project')
      }

      const project = await response.json()
      router.push(`/project/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Project
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Set up your content creation project
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Platform
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLATFORMS.map(({ value, label, icon: Icon, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlatform(value)}
                    className={`
                      flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                      ${platform === value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${platform === value
                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className={`
                        block font-medium
                        ${platform === value
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-900 dark:text-white'
                        }
                      `}>
                        {label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                        {description}
                      </span>
                    </div>
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                placeholder="What is your content about? Be specific about the main message or idea..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Target Audience */}
            <div>
              <label htmlFor="audience" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Audience
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                id="audience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., B2B enterprise decision makers, startup founders, tech enthusiasts"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Content Style */}
            <div>
              <label htmlFor="style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Style/Tone
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                id="style"
                type="text"
                value={contentStyle}
                onChange={(e) => setContentStyle(e.target.value)}
                placeholder="e.g., Professional but approachable, thought leadership, conversational"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !topic.trim()}
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
