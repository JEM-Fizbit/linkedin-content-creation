'use client'

import { useState, useEffect, useCallback } from 'react'
import { Paperclip, ChevronDown, Plus, Globe, Loader2 } from 'lucide-react'
import { SourceItem } from './SourceItem'
import { SourceUploadModal } from './SourceUploadModal'
import { ReferenceImageItem } from './ReferenceImageItem'
import { ReferenceImageUpload } from './ReferenceImageUpload'
import type { ProjectAsset } from '@/types'

interface SourceListItem {
  id: string
  project_id: string
  type: 'text' | 'file' | 'url'
  title: string
  word_count: number
  original_filename?: string
  original_url?: string
  enabled: boolean
  created_at: string
}

interface SearchSettings {
  web_search_enabled: boolean
  search_provider: 'claude' | 'perplexity' | 'auto'
  max_searches: number
}

interface ContextPanelProps {
  projectId: string
}

export function ContextPanel({ projectId }: ContextPanelProps) {
  const [sources, setSources] = useState<SourceListItem[]>([])
  const [assets, setAssets] = useState<(ProjectAsset & { thumbnailUrl?: string })[]>([])
  const [collapsed, setCollapsed] = useState(true)
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [previewContent, setPreviewContent] = useState<{ title: string; content: string } | null>(null)

  // Search settings state
  const [searchSettings, setSearchSettings] = useState<SearchSettings>({
    web_search_enabled: false,
    search_provider: 'claude',
    max_searches: 5,
  })
  const [isUpdatingSearch, setIsUpdatingSearch] = useState(false)

  const fetchSources = useCallback(async () => {
    try {
      const response = await fetch(`/api/sources?project_id=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setSources(data)
      }
    } catch (err) {
      console.error('Failed to fetch sources:', err)
    }
  }, [projectId])

  const fetchAssets = useCallback(async () => {
    try {
      const response = await fetch(`/api/assets?project_id=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        // Build thumbnail URLs for each asset
        const assetsWithThumbs = data.map((asset: ProjectAsset) => ({
          ...asset,
          thumbnailUrl: `/api/assets/${asset.id}?format=image`,
        }))
        setAssets(assetsWithThumbs)
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err)
    }
  }, [projectId])

  const fetchSearchSettings = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/search-settings`)
      if (response.ok) {
        const data = await response.json()
        setSearchSettings(data)
      }
    } catch (err) {
      console.error('Failed to fetch search settings:', err)
    }
  }, [projectId])

  const handleToggleWebSearch = async () => {
    setIsUpdatingSearch(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/search-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ web_search_enabled: !searchSettings.web_search_enabled }),
      })
      if (response.ok) {
        const data = await response.json()
        setSearchSettings(data)
      }
    } catch (err) {
      console.error('Failed to update search settings:', err)
    } finally {
      setIsUpdatingSearch(false)
    }
  }

  const handleChangeProvider = async (provider: 'claude' | 'perplexity') => {
    setIsUpdatingSearch(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/search-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_provider: provider }),
      })
      if (response.ok) {
        const data = await response.json()
        setSearchSettings(data)
      }
    } catch (err) {
      console.error('Failed to update search provider:', err)
    } finally {
      setIsUpdatingSearch(false)
    }
  }

  useEffect(() => {
    fetchSources()
    fetchAssets()
    fetchSearchSettings()
  }, [fetchSources, fetchAssets, fetchSearchSettings])

  const handleToggleSource = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      setSources(prev => prev.map(s => s.id === id ? { ...s, enabled } : s))
    } catch (err) {
      console.error('Failed to toggle source:', err)
    }
  }

  const handleDeleteSource = async (id: string) => {
    try {
      await fetch(`/api/sources/${id}`, { method: 'DELETE' })
      setSources(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Failed to delete source:', err)
    }
  }

  const handlePreviewSource = async (id: string) => {
    try {
      const response = await fetch(`/api/sources/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPreviewContent({ title: data.title, content: data.content })
      }
    } catch (err) {
      console.error('Failed to load source preview:', err)
    }
  }

  const handleDeleteAsset = async (id: string) => {
    try {
      await fetch(`/api/assets/${id}`, { method: 'DELETE' })
      setAssets(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error('Failed to delete asset:', err)
    }
  }

  const totalSources = sources.length
  const totalAssets = assets.length
  const hasContext = totalSources > 0 || totalAssets > 0

  // Summary text for collapsed state
  const summaryParts: string[] = []
  if (totalSources > 0) summaryParts.push(`${totalSources} source${totalSources !== 1 ? 's' : ''}`)
  if (totalAssets > 0) summaryParts.push(`${totalAssets} image${totalAssets !== 1 ? 's' : ''}`)
  const summaryText = summaryParts.join(', ')

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden relative z-10">
        {/* Header (always visible) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Context
          </span>
          {hasContext && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {summaryText}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 ml-auto transition-transform duration-200 ${
              collapsed ? '' : 'rotate-180'
            }`}
          />
        </button>

        {/* Expanded content */}
        {!collapsed && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">
            {/* Information Sources */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Information Sources
                </h4>
                <button
                  onClick={() => setShowSourceModal(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              {sources.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
                  No sources yet. Add notes, files, or URLs to give the AI more context.
                </p>
              ) : (
                <div className="space-y-2">
                  {sources.map(source => (
                    <SourceItem
                      key={source.id}
                      id={source.id}
                      type={source.type}
                      title={source.title}
                      wordCount={source.word_count}
                      enabled={source.enabled}
                      onToggle={handleToggleSource}
                      onDelete={handleDeleteSource}
                      onPreview={handlePreviewSource}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Reference Images */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Reference Images
                </h4>
              </div>

              <div className="flex flex-wrap gap-3 items-start">
                {assets.map(asset => (
                  <ReferenceImageItem
                    key={asset.id}
                    id={asset.id}
                    filename={asset.filename}
                    type={asset.type}
                    thumbnailUrl={asset.thumbnailUrl || ''}
                    onDelete={handleDeleteAsset}
                  />
                ))}
                <ReferenceImageUpload
                  projectId={projectId}
                  onImageAdded={fetchAssets}
                />
              </div>
            </div>

            {/* Web Search */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Web Research
                    </h4>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      AI searches the web for current info on your topic
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleWebSearch}
                  disabled={isUpdatingSearch}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    searchSettings.web_search_enabled
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={searchSettings.web_search_enabled}
                >
                  {isUpdatingSearch ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-3 h-3 animate-spin text-white" />
                    </span>
                  ) : (
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        searchSettings.web_search_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  )}
                </button>
              </div>
              {searchSettings.web_search_enabled && (
                <div className="mt-3 ml-6 space-y-2">
                  {/* Provider selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Provider:</span>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => handleChangeProvider('claude')}
                        disabled={isUpdatingSearch}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          searchSettings.search_provider === 'claude'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        Claude
                      </button>
                      <button
                        onClick={() => handleChangeProvider('perplexity')}
                        disabled={isUpdatingSearch}
                        className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-200 dark:border-gray-600 ${
                          searchSettings.search_provider === 'perplexity'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        Perplexity
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Note: Web research may add 30-60 seconds to generation time
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Source upload modal */}
      {showSourceModal && (
        <SourceUploadModal
          projectId={projectId}
          onClose={() => setShowSourceModal(false)}
          onSourceAdded={() => { fetchSources(); setShowSourceModal(false) }}
        />
      )}

      {/* Source preview modal */}
      {previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {previewContent.title}
              </h3>
              <button
                onClick={() => setPreviewContent(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              >
                <span className="sr-only">Close</span>
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                {previewContent.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
