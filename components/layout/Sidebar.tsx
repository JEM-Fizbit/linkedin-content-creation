'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import type { Session } from '@/types'

interface SidebarProps {
  sessions: Session[]
  onRefresh: () => void
}

export default function Sidebar({ sessions, onRefresh }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.original_idea.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-light-bg-secondary dark:bg-dark-bg-secondary border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo and Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linkedin rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LI</span>
            </div>
            <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">
              LI-Creator
            </span>
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* New Idea Button */}
      <div className="p-4">
        <Link
          href="/session/new"
          className={cn(
            'btn-primary w-full gap-2',
            isCollapsed ? 'px-2 justify-center' : ''
          )}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {!isCollapsed && <span>New Idea</span>}
        </Link>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input text-sm"
          />
        </div>
      )}

      {/* Session List */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2">
        {!isCollapsed && (
          <div className="space-y-1">
            {filteredSessions.length === 0 ? (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary px-2 py-4">
                {searchQuery ? 'No sessions found' : 'No sessions yet'}
              </p>
            ) : (
              filteredSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/session/${session.id}`}
                  className={cn(
                    'block p-3 rounded-lg transition-colors',
                    pathname === `/session/${session.id}`
                      ? 'bg-linkedin/10 border border-linkedin/20'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary truncate">
                    {truncate(session.title, 30)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
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
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        {!isCollapsed && (
          <>
            <Link
              href="/favorites"
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg text-sm transition-colors',
                pathname === '/favorites'
                  ? 'bg-linkedin/10 text-linkedin'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Favorites
            </Link>
            <Link
              href="/published"
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg text-sm transition-colors',
                pathname === '/published'
                  ? 'bg-linkedin/10 text-linkedin'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Published Posts
            </Link>
          </>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg text-sm transition-colors w-full',
            'text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
          {!isCollapsed && (theme === 'light' ? 'Dark Mode' : 'Light Mode')}
        </button>
      </div>
    </aside>
  )
}
