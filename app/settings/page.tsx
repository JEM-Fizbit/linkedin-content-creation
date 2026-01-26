'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, RotateCcw, Loader2, Check, ChevronDown } from 'lucide-react'
import type { Setting, SettingKey } from '@/types'

const VOICE_STYLE_PROMPTS: { key: SettingKey; label: string; description: string; rows: number }[] = [
  {
    key: 'master_voice_prompt',
    label: 'Master Voice & Style',
    description: 'Your universal writing DNA — applied to ALL content across every platform',
    rows: 10,
  },
  {
    key: 'linkedin_tone_prompt',
    label: 'LinkedIn Tone',
    description: 'Platform-specific tone modifier layered on top of your master voice for LinkedIn content',
    rows: 6,
  },
  {
    key: 'youtube_tone_prompt',
    label: 'YouTube Tone',
    description: 'Platform-specific tone modifier layered on top of your master voice for YouTube content',
    rows: 6,
  },
  {
    key: 'facebook_tone_prompt',
    label: 'Facebook Tone',
    description: 'Platform-specific tone modifier layered on top of your master voice for Facebook content',
    rows: 6,
  },
]

const AGENT_PROMPTS: { key: SettingKey; label: string; description: string }[] = [
  {
    key: 'hooks_agent_prompt',
    label: 'Hooks Agent',
    description: 'System prompt for generating attention-grabbing opening lines',
  },
  {
    key: 'body_agent_prompt',
    label: 'Body Content Agent',
    description: 'System prompt for generating main content body',
  },
  {
    key: 'intros_agent_prompt',
    label: 'Intros Agent',
    description: 'System prompt for generating video introduction scripts',
  },
  {
    key: 'titles_agent_prompt',
    label: 'Titles Agent',
    description: 'System prompt for generating optimized titles',
  },
  {
    key: 'ctas_agent_prompt',
    label: 'CTAs Agent',
    description: 'System prompt for generating calls-to-action',
  },
  {
    key: 'thumbnails_agent_prompt',
    label: 'Thumbnails Agent',
    description: 'System prompt for generating thumbnail concepts',
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({})
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const toggleExpanded = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/settings')
        if (!response.ok) throw new Error('Failed to fetch settings')
        const data = await response.json()
        setSettings(data)
        // Initialize edited values
        const values: Record<string, string> = {}
        data.forEach((s: Setting) => {
          values[s.key] = s.value
        })
        setEditedValues(values)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // Save a specific setting
  const handleSave = async (key: SettingKey) => {
    const value = editedValues[key]
    if (!value) return

    setIsSaving(prev => ({ ...prev, [key]: true }))
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })

      if (!response.ok) throw new Error('Failed to save setting')

      const updatedSetting = await response.json()
      setSettings(prev => prev.map(s => s.key === key ? updatedSetting : s))

      // Show saved indicator
      setSavedKeys(prev => new Set(Array.from(prev).concat([key])))
      setTimeout(() => {
        setSavedKeys(prev => {
          const newSet = new Set(prev)
          newSet.delete(key)
          return newSet
        })
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(prev => ({ ...prev, [key]: false }))
    }
  }

  // Reset a specific setting to default
  const handleReset = async (key: SettingKey) => {
    setIsSaving(prev => ({ ...prev, [key]: true }))
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })

      if (!response.ok) throw new Error('Failed to reset setting')

      const updatedSetting = await response.json()
      setSettings(prev => prev.map(s => s.key === key ? updatedSetting : s))
      setEditedValues(prev => ({ ...prev, [key]: updatedSetting.value }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset')
    } finally {
      setIsSaving(prev => ({ ...prev, [key]: false }))
    }
  }

  // Check if a setting has been modified
  const isModified = (key: string) => {
    const original = settings.find(s => s.key === key)?.value
    return original !== editedValues[key]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Customize AI agent system prompts
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Voice & Style Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Voice & Style</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Define your writing voice and platform-specific tones. These are layered into every generation call.
          </p>
          <div className="space-y-3">
            {VOICE_STYLE_PROMPTS.map(({ key, label, description, rows }) => {
              const value = editedValues[key] || ''
              const modified = isModified(key)
              const saving = isSaving[key]
              const saved = savedKeys.has(key)
              const expanded = expandedKeys.has(key)
              const preview = value.replace(/\n/g, ' ').slice(0, 80) + (value.length > 80 ? '...' : '')

              return (
                <div
                  key={key}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div
                    className="px-6 py-4 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    onClick={() => toggleExpanded(key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {label}
                          </h3>
                          {modified && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Unsaved changes" />
                          )}
                          {saved && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                              <Check className="w-3 h-3" />
                              Saved
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {description}
                        </p>
                        {!expanded && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-mono truncate">
                            {preview}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {expanded && (
                    <div className="px-6 pb-5 border-t border-gray-100 dark:border-gray-700">
                      <textarea
                        value={value}
                        onChange={(e) => setEditedValues(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={rows}
                        className="w-full mt-4 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReset(key) }}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
                          title="Reset to default"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reset
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSave(key) }}
                          disabled={saving || !modified}
                          className={`
                            px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5
                            ${modified
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            }
                          `}
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700 my-8" />

        {/* Section Agent Prompts */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Section Agent Prompts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Expert instructions for each content section. Applied when regenerating specific sections.
          </p>
          <div className="space-y-3">
            {AGENT_PROMPTS.map(({ key, label, description }) => {
              const value = editedValues[key] || ''
              const modified = isModified(key)
              const saving = isSaving[key]
              const saved = savedKeys.has(key)
              const expanded = expandedKeys.has(key)
              const preview = value.replace(/\n/g, ' ').slice(0, 80) + (value.length > 80 ? '...' : '')

              return (
                <div
                  key={key}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div
                    className="px-6 py-4 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    onClick={() => toggleExpanded(key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {label}
                          </h3>
                          {modified && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Unsaved changes" />
                          )}
                          {saved && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                              <Check className="w-3 h-3" />
                              Saved
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {description}
                        </p>
                        {!expanded && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-mono truncate">
                            {preview}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {expanded && (
                    <div className="px-6 pb-5 border-t border-gray-100 dark:border-gray-700">
                      <textarea
                        value={value}
                        onChange={(e) => setEditedValues(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={8}
                        className="w-full mt-4 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReset(key) }}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
                          title="Reset to default"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reset
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSave(key) }}
                          disabled={saving || !modified}
                          className={`
                            px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5
                            ${modified
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            }
                          `}
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
