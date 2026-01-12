'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Session, Favorite, FavoriteType } from '@/types'

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<FavoriteType | 'all'>('all')
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    fetchFavorites()
    fetchSessions()
  }, [selectedType])

  // Filter favorites by search query
  const filteredFavorites = favorites.filter(favorite => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    const content = favorite.content

    if (typeof content === 'string') {
      return content.toLowerCase().includes(query)
    }
    if ('description' in content) {
      return content.description.toLowerCase().includes(query)
    }
    if ('name' in content && 'body_content' in content) {
      const templateContent = content as { name?: string; body_content: string; hooks: string[]; ctas: string[] }
      return (
        (templateContent.name?.toLowerCase().includes(query)) ||
        templateContent.body_content.toLowerCase().includes(query) ||
        templateContent.hooks.some(h => h.toLowerCase().includes(query)) ||
        templateContent.ctas.some(c => c.toLowerCase().includes(query))
      )
    }
    return false
  })

  const fetchFavorites = async () => {
    try {
      setIsLoading(true)
      const url = selectedType === 'all'
        ? '/api/favorites'
        : `/api/favorites?type=${selectedType}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch favorites')
      const data = await response.json()
      setFavorites(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch {
      // Silently fail
    }
  }

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopySuccess(id)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return

    try {
      const response = await fetch(`/api/favorites/${deleteConfirmId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete favorite')
      setFavorites(prev => prev.filter(f => f.id !== deleteConfirmId))
      setDeleteConfirmId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete favorite')
      setDeleteConfirmId(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmId(null)
  }

  const getSessionTitle = (sessionId: string | null) => {
    if (!sessionId) return null
    const session = sessions.find(s => s.id === sessionId)
    return session?.title || 'Unknown Session'
  }

  const getTypeIcon = (type: FavoriteType) => {
    switch (type) {
      case 'hook':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        )
      case 'cta':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        )
      case 'body':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'visual':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'template':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        )
    }
  }

  const getTypeLabel = (type: FavoriteType) => {
    switch (type) {
      case 'hook': return 'Hook'
      case 'cta': return 'CTA'
      case 'body': return 'Body'
      case 'visual': return 'Visual'
      case 'template': return 'Template'
    }
  }

  const getTypeColor = (type: FavoriteType) => {
    switch (type) {
      case 'hook': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      case 'cta': return 'bg-green-500/10 text-green-600 dark:text-green-400'
      case 'body': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      case 'visual': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
      case 'template': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
    }
  }

  // Get plain text content for copying
  const getContentForCopy = (favorite: Favorite): string => {
    const content = favorite.content
    if (typeof content === 'string') {
      return content
    }
    if ('description' in content) {
      return content.description
    }
    // Template content - format as readable text
    if ('hooks' in content && 'body_content' in content) {
      const templateContent = content as { name?: string; hooks: string[]; body_content: string; ctas: string[] }
      const parts: string[] = []
      if (templateContent.name) {
        parts.push(`Template: ${templateContent.name}`)
      }
      parts.push(`Hooks:\n${templateContent.hooks.join('\n')}`)
      parts.push(`Body:\n${templateContent.body_content}`)
      parts.push(`CTAs:\n${templateContent.ctas.join('\n')}`)
      return parts.join('\n\n')
    }
    return JSON.stringify(content)
  }

  // Render content for display (can include JSX)
  const renderContent = (favorite: Favorite): React.ReactNode => {
    const content = favorite.content
    if (typeof content === 'string') {
      return content
    }
    if ('description' in content) {
      return content.description
    }
    // Template content
    if ('hooks' in content && 'body_content' in content) {
      const templateContent = content as { name?: string; hooks: string[]; body_content: string; ctas: string[] }
      return (
        <div className="space-y-2">
          {templateContent.name && (
            <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
              {templateContent.name}
            </p>
          )}
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            {templateContent.hooks.length} hooks, {templateContent.ctas.length} CTAs
          </p>
          <p className="text-xs line-clamp-2">{templateContent.body_content.substring(0, 100)}...</p>
        </div>
      )
    }
    return JSON.stringify(content)
  }

  const getTemplateName = (favorite: Favorite): string | null => {
    const content = favorite.content
    if (typeof content === 'object' && 'name' in content) {
      return (content as { name: string }).name
    }
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sessions={sessions} onRefresh={fetchSessions} />
      <main className="flex-1 overflow-auto">
        {/* Breadcrumbs */}
        <nav className="px-8 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <button
                onClick={() => router.push('/')}
                className="text-light-text-secondary dark:text-dark-text-secondary hover:text-linkedin transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
            </li>
            <li className="text-light-text-secondary dark:text-dark-text-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-light-text-primary dark:text-dark-text-primary font-medium">
              Favorites
            </li>
          </ol>
        </nav>

        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                Favorites
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
                Your saved hooks, CTAs, body content, and visual concepts
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search favorites..."
                className="input pl-10 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(['all', 'hook', 'cta', 'body', 'visual', 'template'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  selectedType === type
                    ? 'bg-linkedin text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {type === 'all' ? 'All' : getTypeLabel(type)}
                {type !== 'all' && (
                  <span className="ml-2 text-xs opacity-75">
                    ({favorites.filter(f => selectedType === 'all' ? f.type === type : true).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
              <p className="text-error">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-light-text-secondary dark:text-dark-text-secondary">
                Loading favorites...
              </div>
            </div>
          ) : favorites.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                No favorites yet
              </h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4 max-w-sm mx-auto">
                Save hooks, CTAs, body content, and visual concepts from your sessions to build your favorites library.
              </p>
              <button
                onClick={() => router.push('/session/new')}
                className="btn-primary"
              >
                Create New Session
              </button>
            </div>
          ) : filteredFavorites.length === 0 ? (
            /* No Search Results */
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                No results found
              </h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4 max-w-sm mx-auto">
                No favorites match your search for "{searchQuery}". Try a different search term.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="btn-secondary"
              >
                Clear Search
              </button>
            </div>
          ) : (
            /* Favorites Grid */
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFavorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                      getTypeColor(favorite.type)
                    )}>
                      {getTypeIcon(favorite.type)}
                      {getTypeLabel(favorite.type)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(getContentForCopy(favorite), favorite.id)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          copySuccess === favorite.id
                            ? 'text-success bg-success/10'
                            : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-linkedin hover:bg-linkedin/10'
                        )}
                        title={copySuccess === favorite.id ? 'Copied!' : 'Copy'}
                      >
                        {copySuccess === favorite.id ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(favorite.id)}
                        className="p-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Remove from favorites"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-light-text-primary dark:text-dark-text-primary text-sm leading-relaxed line-clamp-4">
                    {renderContent(favorite)}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      {formatRelativeTime(favorite.created_at)}
                    </span>
                    {favorite.source_session_id && (
                      <button
                        onClick={() => router.push(`/session/${favorite.source_session_id}`)}
                        className="text-xs text-linkedin hover:underline flex items-center gap-1"
                        title="View source session"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Source
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                  Delete Favorite
                </h3>
              </div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
                Are you sure you want to delete this favorite? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium bg-error text-white rounded-lg hover:bg-error/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
