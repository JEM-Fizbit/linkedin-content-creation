'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import type { Session, ConnectionStatus, SessionStatus } from '@/types'

interface DashboardProps {
  sessions: Session[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}

export default function Dashboard({ sessions, isLoading, error, onRefresh }: DashboardProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all')

  useEffect(() => {
    checkConnectionStatus()
    const interval = setInterval(checkConnectionStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/connection/status')
      if (response.ok) {
        const data = await response.json()
        setConnectionStatus(data)
      }
    } catch {
      setConnectionStatus({ connected: false, last_checked: new Date().toISOString(), error: 'Failed to check connection' })
    }
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch =
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.original_idea.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Empty state for new users
  if (!isLoading && !error && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-linkedin/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-3">
            Welcome to LI-Creator
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">
            Transform your rough post ideas into polished, engagement-optimized LinkedIn content.
            Start by sharing an idea, and let AI help you craft the perfect post.
          </p>
          <Link href="/session/new" className="btn-primary inline-flex gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start Your First Post
          </Link>

          {/* Connection Status */}
          <div className="mt-8 p-4 rounded-lg bg-light-bg-secondary dark:bg-dark-bg-secondary">
            <div className="flex items-center gap-2 text-sm">
              <div className={cn(
                'w-2 h-2 rounded-full',
                connectionStatus?.connected ? 'bg-success' : 'bg-error'
              )} />
              <span className="text-light-text-secondary dark:text-dark-text-secondary">
                Claude SDK: {connectionStatus?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Dashboard
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Your LinkedIn content sessions
          </p>
        </div>

        {/* Connection Status Badge */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
          connectionStatus?.connected
            ? 'bg-success/10 text-success'
            : 'bg-error/10 text-error'
        )}>
          <div className={cn(
            'w-2 h-2 rounded-full',
            connectionStatus?.connected ? 'bg-success animate-pulse' : 'bg-error'
          )} />
          {connectionStatus?.connected ? 'Claude Connected' : 'Claude Disconnected'}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input max-w-md"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SessionStatus | 'all')}
          className="input w-40"
        >
          <option value="all">All Status</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card p-6 text-center">
          <svg className="w-12 h-12 text-error mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-error mb-4">{error}</p>
          <button onClick={onRefresh} className="btn-secondary">
            Try Again
          </button>
        </div>
      )}

      {/* Session Cards */}
      {!isLoading && !error && (
        <>
          {filteredSessions.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {searchQuery || statusFilter !== 'all'
                  ? 'No sessions match your filters'
                  : 'No sessions yet. Create your first post!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/session/${session.id}`}
                  className="card p-4 hover:shadow-md transition-shadow group"
                >
                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary group-hover:text-linkedin transition-colors">
                    {truncate(session.title, 50)}
                  </h3>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2 line-clamp-2">
                    {truncate(session.original_idea, 100)}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      session.status === 'published' && 'bg-success/10 text-success',
                      session.status === 'complete' && 'bg-linkedin/10 text-linkedin',
                      session.status === 'in_progress' && 'bg-warning/10 text-warning'
                    )}>
                      {session.status === 'in_progress' ? 'In Progress' :
                       session.status === 'complete' ? 'Complete' : 'Published'}
                    </span>
                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      {formatRelativeTime(session.created_at)}
                    </span>
                    {session.remix_of_session_id && (
                      <span className="text-xs text-linkedin flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Remix
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
