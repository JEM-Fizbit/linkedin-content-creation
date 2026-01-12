'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Dashboard from '@/components/layout/Dashboard'
import type { Session } from '@/types'

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/sessions')
      if (!response.ok) throw new Error('Failed to fetch sessions')
      const data = await response.json()
      setSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sessions={sessions} onRefresh={fetchSessions} />
      <main className="flex-1 overflow-auto">
        <Dashboard
          sessions={sessions}
          isLoading={isLoading}
          error={error}
          onRefresh={fetchSessions}
        />
      </main>
    </div>
  )
}
