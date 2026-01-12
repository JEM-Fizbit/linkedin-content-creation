'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import type { Session } from '@/types'

interface PerformanceNote {
  id: string
  session_id: string
  views: number | null
  likes: number | null
  comments: number | null
  reposts: number | null
  notes: string
  recorded_at: string
}

interface PublishedSession extends Session {
  performance: PerformanceNote | null
}

type SortField = 'published_at' | 'views' | 'likes' | 'comments' | 'reposts'

export default function PublishedPostsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [publishedSessions, setPublishedSessions] = useState<PublishedSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortField>('published_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch all sessions for the sidebar
  useEffect(() => {
    fetchSessions()
  }, [])

  // Fetch published sessions whenever sort changes
  useEffect(() => {
    fetchPublishedSessions()
  }, [sortBy, sortOrder])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (!response.ok) throw new Error('Failed to fetch sessions')
      const data = await response.json()
      setSessions(data)
    } catch (err) {
      console.error('Error fetching sessions:', err)
    }
  }

  const fetchPublishedSessions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/published?sortBy=${sortBy}&sortOrder=${sortOrder}`)
      if (!response.ok) throw new Error('Failed to fetch published sessions')
      const data = await response.json()
      setPublishedSessions(data.sessions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Toggle order if clicking same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to descending
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'desc' ? (
      <svg className="w-4 h-4 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sessions={sessions} onRefresh={fetchSessions} />
      <main className="flex-1 overflow-auto bg-light-bg-primary dark:bg-dark-bg-primary">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
              Published Posts
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
              Track engagement metrics for your published LinkedIn content
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin"></div>
            </div>
          ) : publishedSessions.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                No published posts yet
              </h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                Once you publish your content, track its performance here.
              </p>
              <Link href="/session/new" className="btn-primary inline-flex">
                Create New Content
              </Link>
            </div>
          ) : (
            /* Posts Table */
            <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-4 py-3 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                        Post
                      </th>
                      <th className="px-4 py-3">
                        <button
                          onClick={() => handleSort('published_at')}
                          className="flex items-center gap-1 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                        >
                          Published
                          <SortIcon field="published_at" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          onClick={() => handleSort('views')}
                          className="flex items-center gap-1 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                        >
                          Views
                          <SortIcon field="views" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          onClick={() => handleSort('likes')}
                          className="flex items-center gap-1 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                        >
                          Likes
                          <SortIcon field="likes" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          onClick={() => handleSort('comments')}
                          className="flex items-center gap-1 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                        >
                          Comments
                          <SortIcon field="comments" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          onClick={() => handleSort('reposts')}
                          className="flex items-center gap-1 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                        >
                          Reposts
                          <SortIcon field="reposts" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedSessions.map((session) => (
                      <tr
                        key={session.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                              {truncate(session.title, 40)}
                            </p>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              {truncate(session.original_idea, 60)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {session.published_at ? formatRelativeTime(session.published_at) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'font-medium',
                            session.performance?.views
                              ? 'text-light-text-primary dark:text-dark-text-primary'
                              : 'text-gray-400'
                          )}>
                            {formatNumber(session.performance?.views)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'font-medium',
                            session.performance?.likes
                              ? 'text-light-text-primary dark:text-dark-text-primary'
                              : 'text-gray-400'
                          )}>
                            {formatNumber(session.performance?.likes)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'font-medium',
                            session.performance?.comments
                              ? 'text-light-text-primary dark:text-dark-text-primary'
                              : 'text-gray-400'
                          )}>
                            {formatNumber(session.performance?.comments)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'font-medium',
                            session.performance?.reposts
                              ? 'text-light-text-primary dark:text-dark-text-primary'
                              : 'text-gray-400'
                          )}>
                            {formatNumber(session.performance?.reposts)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/session/${session.id}`}
                            className="text-linkedin hover:text-linkedin-dark text-sm font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {publishedSessions.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Total Posts</p>
                <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {publishedSessions.length}
                </p>
              </div>
              <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Total Views</p>
                <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {formatNumber(publishedSessions.reduce((sum, s) => sum + (s.performance?.views || 0), 0))}
                </p>
              </div>
              <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Total Likes</p>
                <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {formatNumber(publishedSessions.reduce((sum, s) => sum + (s.performance?.likes || 0), 0))}
                </p>
              </div>
              <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Total Engagement</p>
                <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {formatNumber(publishedSessions.reduce((sum, s) =>
                    sum + (s.performance?.likes || 0) + (s.performance?.comments || 0) + (s.performance?.reposts || 0), 0
                  ))}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
