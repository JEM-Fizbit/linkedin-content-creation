'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, RotateCcw, Loader2, Check } from 'lucide-react'
import type { Setting, SettingKey } from '@/types'

const PROMPT_LABELS: Record<SettingKey, { label: string; description: string }> = {
  hooks_agent_prompt: {
    label: 'Hooks Agent',
    description: 'System prompt for generating attention-grabbing opening lines'
  },
  body_agent_prompt: {
    label: 'Body Content Agent',
    description: 'System prompt for generating main content body'
  },
  intros_agent_prompt: {
    label: 'Intros Agent',
    description: 'System prompt for generating video introduction scripts'
  },
  titles_agent_prompt: {
    label: 'Titles Agent',
    description: 'System prompt for generating optimized titles'
  },
  ctas_agent_prompt: {
    label: 'CTAs Agent',
    description: 'System prompt for generating calls-to-action'
  },
  thumbnails_agent_prompt: {
    label: 'Thumbnails Agent',
    description: 'System prompt for generating thumbnail concepts'
  },
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({})
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

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

        <div className="space-y-6">
          {Object.entries(PROMPT_LABELS).map(([key, { label, description }]) => {
            const settingKey = key as SettingKey
            const value = editedValues[settingKey] || ''
            const modified = isModified(settingKey)
            const saving = isSaving[settingKey]
            const saved = savedKeys.has(settingKey)

            return (
              <div
                key={key}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {saved && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                          <Check className="w-4 h-4" />
                          Saved
                        </span>
                      )}

                      <button
                        onClick={() => handleReset(settingKey)}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
                        title="Reset to default"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>

                      <button
                        onClick={() => handleSave(settingKey)}
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
                </div>

                <div className="p-6">
                  <textarea
                    value={value}
                    onChange={(e) => setEditedValues(prev => ({ ...prev, [settingKey]: e.target.value }))}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
