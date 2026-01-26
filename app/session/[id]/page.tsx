'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Session, Message, Output } from '@/types'

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [output, setOutput] = useState<Output | null>(null)
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'output'>('chat')
  const [editingHookIndex, setEditingHookIndex] = useState<number | null>(null)
  const [editedHooks, setEditedHooks] = useState<string[]>([])
  const [editingCtaIndex, setEditingCtaIndex] = useState<number | null>(null)
  const [editedCtas, setEditedCtas] = useState<string[]>([])
  const [isEditingBody, setIsEditingBody] = useState(false)
  const [editedBody, setEditedBody] = useState('')
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [savedFavorites, setSavedFavorites] = useState<Set<string>>(new Set())
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPerformanceForm, setShowPerformanceForm] = useState(false)
  const [performanceNotes, setPerformanceNotes] = useState<{
    views: string
    likes: string
    comments: string
    reposts: string
    notes: string
  }>({ views: '', likes: '', comments: '', reposts: '', notes: '' })
  const [isSavingPerformance, setIsSavingPerformance] = useState(false)
  const [performanceSaved, setPerformanceSaved] = useState(false)
  const [isCreatingRemix, setIsCreatingRemix] = useState(false)
  const [originalSession, setOriginalSession] = useState<Session | null>(null)
  const [regeneratingSection, setRegeneratingSection] = useState<'hooks' | 'body' | 'ctas' | 'visuals' | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedHookIndex, setSelectedHookIndex] = useState<number>(0)
  const [selectedCtaIndex, setSelectedCtaIndex] = useState<number>(0)
  const [linkedInCopySuccess, setLinkedInCopySuccess] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [pendingRetryMessage, setPendingRetryMessage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const MAX_RETRIES = 3

  // Fetch session data
  useEffect(() => {
    fetchSession()
    fetchAllSessions()
    fetchOutput()
    fetchPerformanceNotes()
  }, [sessionId])

  // Fetch original session if this is a remix
  useEffect(() => {
    if (session?.remix_of_session_id) {
      fetchOriginalSession(session.remix_of_session_id)
    }
  }, [session?.remix_of_session_id])

  const fetchOriginalSession = async (originalId: string) => {
    try {
      const response = await fetch(`/api/sessions/${originalId}`)
      if (response.ok) {
        const data = await response.json()
        setOriginalSession(data.session)
      }
    } catch {
      // Original session might have been deleted
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize edited hooks, CTAs, and body when output changes
  useEffect(() => {
    if (output) {
      setEditedHooks([...output.hooks])
      setEditedCtas([...output.ctas])
      setEditedBody(output.body_content)
    }
  }, [output])

  const fetchSession = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/')
          return
        }
        throw new Error('Failed to fetch session')
      }
      const data = await response.json()
      setSession(data.session)
      setMessages(data.messages || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        setAllSessions(data)
      }
    } catch {
      // Silently fail - sidebar will just show empty
    }
  }

  const fetchOutput = async () => {
    try {
      const response = await fetch(`/api/outputs/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setOutput(data.output)
      }
    } catch {
      // Output might not exist yet, that's fine
    }
  }

  const fetchPerformanceNotes = async () => {
    try {
      const response = await fetch(`/api/performance-notes/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.note) {
          setPerformanceNotes({
            views: data.note.views?.toString() || '',
            likes: data.note.likes?.toString() || '',
            comments: data.note.comments?.toString() || '',
            reposts: data.note.reposts?.toString() || '',
            notes: data.note.notes || '',
          })
          setPerformanceSaved(true)
        }
      }
    } catch {
      // Performance notes might not exist yet, that's fine
    }
  }

  const handleSavePerformance = async () => {
    setIsSavingPerformance(true)
    try {
      const response = await fetch(`/api/performance-notes/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          views: performanceNotes.views ? parseInt(performanceNotes.views) : null,
          likes: performanceNotes.likes ? parseInt(performanceNotes.likes) : null,
          comments: performanceNotes.comments ? parseInt(performanceNotes.comments) : null,
          reposts: performanceNotes.reposts ? parseInt(performanceNotes.reposts) : null,
          notes: performanceNotes.notes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save performance notes')
      }

      setPerformanceSaved(true)
      setShowPerformanceForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save performance notes')
    } finally {
      setIsSavingPerformance(false)
    }
  }

  // Helper function to send chat message with retry logic
  const sendChatMessage = async (message: string, tempMessageId: string, attempt: number = 0): Promise<boolean> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: message,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Replace temp message with real one and add assistant response
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempMessageId)
        return [...withoutTemp, data.userMessage, data.assistantMessage]
      })

      // Reset retry state on success
      setRetryCount(0)
      setIsReconnecting(false)
      setPendingRetryMessage(null)
      return true
    } catch (err) {
      // If we haven't reached max retries, try again with exponential backoff
      if (attempt < MAX_RETRIES) {
        const nextAttempt = attempt + 1
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        setIsReconnecting(true)
        setRetryCount(nextAttempt)
        setPendingRetryMessage(message)

        await new Promise(resolve => setTimeout(resolve, delay))
        return sendChatMessage(message, tempMessageId, nextAttempt)
      }

      // Max retries reached - show error and allow manual retry
      setIsReconnecting(false)
      setError('Connection failed. Please try again.')
      setPendingRetryMessage(message)
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessageId))
      return false
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    const userMessage = newMessage.trim()
    setNewMessage('')
    setIsSending(true)
    setError(null)
    setRetryCount(0)

    // Optimistically add user message
    const tempMessageId = `temp-${Date.now()}`
    const tempUserMessage: Message = {
      id: tempMessageId,
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    await sendChatMessage(userMessage, tempMessageId)
    setIsSending(false)
  }

  // Manual retry function for when auto-retry fails
  const handleManualRetry = async () => {
    if (!pendingRetryMessage) return

    setError(null)
    setIsSending(true)
    setRetryCount(0)

    const tempMessageId = `temp-${Date.now()}`
    const tempUserMessage: Message = {
      id: tempMessageId,
      session_id: sessionId,
      role: 'user',
      content: pendingRetryMessage,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    await sendChatMessage(pendingRetryMessage, tempMessageId)
    setIsSending(false)
  }

  const handleGenerateContent = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/outputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      setOutput(data.output)
      setActiveTab('output')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveHook = async (index: number) => {
    if (!output) return

    try {
      const newHooks = [...editedHooks]
      const response = await fetch(`/api/outputs/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hooks: newHooks }),
      })

      if (!response.ok) {
        throw new Error('Failed to save hook')
      }

      const data = await response.json()
      setOutput(data.output)
      setEditingHookIndex(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hook')
    }
  }

  const handleCopyHook = async (hook: string, index: number) => {
    try {
      await navigator.clipboard.writeText(hook)
      setCopySuccess(`hook-${index}`)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const handleRevertHook = async (index: number) => {
    if (!output) return
    const newHooks = [...editedHooks]
    newHooks[index] = output.hooks_original[index]
    setEditedHooks(newHooks)

    // Save reverted content to database
    try {
      const response = await fetch(`/api/outputs/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hooks: newHooks }),
      })

      if (response.ok) {
        const data = await response.json()
        setOutput(data.output)
      }
    } catch {
      // Silently fail - UI already updated
    }
  }

  const handleSaveCta = async (index: number) => {
    if (!output) return

    try {
      const newCtas = [...editedCtas]
      const response = await fetch(`/api/outputs/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ctas: newCtas }),
      })

      if (!response.ok) {
        throw new Error('Failed to save CTA')
      }

      const data = await response.json()
      setOutput(data.output)
      setEditingCtaIndex(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save CTA')
    }
  }

  const handleCopyCta = async (cta: string, index: number) => {
    try {
      await navigator.clipboard.writeText(cta)
      setCopySuccess(`cta-${index}`)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const handleRevertCta = async (index: number) => {
    if (!output) return
    const newCtas = [...editedCtas]
    newCtas[index] = output.ctas_original[index]
    setEditedCtas(newCtas)

    // Save reverted content to database
    try {
      const response = await fetch(`/api/outputs/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ctas: newCtas }),
      })

      if (response.ok) {
        const data = await response.json()
        setOutput(data.output)
      }
    } catch {
      // Silently fail - UI already updated
    }
  }

  const handleSaveBody = async () => {
    if (!output) return

    try {
      const response = await fetch(`/api/outputs/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_content: editedBody }),
      })

      if (!response.ok) {
        throw new Error('Failed to save body content')
      }

      const data = await response.json()
      setOutput(data.output)
      setIsEditingBody(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save body content')
    }
  }

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(editedBody)
      setCopySuccess('body')
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const handleRevertBody = async () => {
    if (!output) return
    setEditedBody(output.body_content_original)

    // Save reverted content to database
    try {
      const response = await fetch(`/api/outputs/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_content: output.body_content_original }),
      })

      if (response.ok) {
        const data = await response.json()
        setOutput(data.output)
      }
    } catch {
      // Silently fail - UI already updated
    }
  }

  const handleSaveToFavorites = async (type: 'hook' | 'cta' | 'body', content: string, index?: number) => {
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content,
          source_session_id: sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save to favorites')
      }

      // Mark as saved
      const key = index !== undefined ? `${type}-${index}` : type
      setSavedFavorites(prev => new Set(prev).add(key))

      // Show success message
      setCopySuccess(`fav-${key}`)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to favorites')
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!output || !templateName.trim()) return

    setIsSavingTemplate(true)
    try {
      const templateContent = {
        name: templateName.trim(),
        hooks: editedHooks,
        body_content: editedBody,
        ctas: editedCtas,
        visual_concepts: output.visual_concepts,
      }

      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template',
          content: templateContent,
          source_session_id: sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save template')
      }

      // Mark as saved and close modal
      setSavedFavorites(prev => new Set(prev).add('template'))
      setShowTemplateModal(false)
      setTemplateName('')
      setCopySuccess('template-saved')
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleUpdateStatus = async (newStatus: 'complete' | 'published') => {
    if (!session) return

    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      const updatedSession = await response.json()
      setSession(updatedSession)

      // Refresh sidebar session list
      fetchAllSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDeleteSession = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete session')
      }

      // Redirect to dashboard after deletion
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session')
      setShowDeleteModal(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRemix = async () => {
    if (!session) return

    setIsCreatingRemix(true)
    try {
      // Create a new session as a remix of this one
      const remixIdea = `Remix of: ${session.original_idea}`
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_idea: remixIdea,
          remix_of_session_id: session.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create remix')
      }

      const newSession = await response.json()

      // Add initial message with context from original session
      const contextMessage = `I want to create a remix of my previous post. Here's what the original post was about:

Original idea: ${session.original_idea}

Please help me create a fresh take on this topic with a new angle or perspective.`

      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: newSession.id,
          message: contextMessage,
        }),
      })

      // Navigate to the new remix session
      router.push(`/session/${newSession.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create remix')
    } finally {
      setIsCreatingRemix(false)
    }
  }

  const handleRegenerateSection = async (section: 'hooks' | 'body' | 'ctas' | 'visuals') => {
    if (!session || !output) return

    setRegeneratingSection(section)
    setError(null)

    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          section,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to regenerate ${section}`)
      }

      const data = await response.json()
      setOutput(data.output)

      // Update the edited arrays with new content
      if (section === 'hooks') {
        setEditedHooks([...data.output.hooks])
      } else if (section === 'body') {
        setEditedBody(data.output.body_content)
      } else if (section === 'ctas') {
        setEditedCtas([...data.output.ctas])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to regenerate ${section}`)
    } finally {
      setRegeneratingSection(null)
    }
  }

  const handleExportMarkdown = async () => {
    if (!session || !output) return

    setIsExporting(true)
    setError(null)

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, format: 'markdown' }),
      })

      if (!response.ok) {
        throw new Error('Failed to export content')
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${session.title}.md`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/)
        if (match) filename = match[1]
      }

      // Create blob and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export content')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = async () => {
    if (!session || !output) return

    setIsExporting(true)
    setError(null)

    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          selected_hook_index: selectedHookIndex,
          selected_cta_index: selectedCtaIndex
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to export PDF')
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${session.title}.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/)
        if (match) filename = match[1]
      }

      // Create blob and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPNG = async (conceptIndex: number) => {
    if (!session || !output) return

    setIsExporting(true)
    setError(null)

    try {
      const response = await fetch('/api/export/png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          concept_index: conceptIndex
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to export PNG')
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${session.title}-concept-${conceptIndex + 1}.png`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/)
        if (match) filename = match[1]
      }

      // Create blob and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PNG')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyForLinkedIn = async () => {
    if (!output) return

    const hook = editedHooks[selectedHookIndex] || ''
    const body = editedBody || ''
    const cta = editedCtas[selectedCtaIndex] || ''

    // Format the content for LinkedIn:
    // Hook at the top, then body, then CTA at the bottom
    // LinkedIn prefers short paragraphs, so we preserve the line breaks
    const linkedInContent = `${hook}

${body}

${cta}`

    try {
      await navigator.clipboard.writeText(linkedInContent)
      setLinkedInCopySuccess(true)
      setTimeout(() => setLinkedInCopySuccess(false), 3000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar sessions={allSessions} onRefresh={fetchAllSessions} />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-light-text-secondary dark:text-dark-text-secondary">
            Loading session...
          </div>
        </main>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar sessions={allSessions} onRefresh={fetchAllSessions} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-error mb-4">{error || 'Session not found'}</p>
            <button onClick={() => router.push('/')} className="btn-secondary">
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sessions={allSessions} onRefresh={fetchAllSessions} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumbs */}
        <nav className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
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
            <li className="text-light-text-primary dark:text-dark-text-primary font-medium truncate max-w-xs">
              {session.title}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                {session.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
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
                {/* Remix indicator */}
                {session.remix_of_session_id && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {originalSession ? (
                      <button
                        onClick={() => router.push(`/session/${session.remix_of_session_id}`)}
                        className="hover:underline"
                      >
                        Remix of: {originalSession.title.substring(0, 20)}...
                      </button>
                    ) : (
                      'Remix'
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Status transition buttons */}
              {session.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateStatus('complete')}
                  disabled={isUpdatingStatus}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                >
                  {isUpdatingStatus ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Finalize
                    </>
                  )}
                </button>
              )}
              {session.status === 'complete' && (
                <button
                  onClick={() => handleUpdateStatus('published')}
                  disabled={isUpdatingStatus}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-linkedin/10 text-linkedin hover:bg-linkedin/20 transition-colors disabled:opacity-50"
                >
                  {isUpdatingStatus ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Mark as Published
                    </>
                  )}
                </button>
              )}
              {session.status === 'published' && session.published_at && (
                <>
                  <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-success bg-success/10 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Published {formatRelativeTime(session.published_at)}
                  </span>
                  <button
                    onClick={() => setShowPerformanceForm(true)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      performanceSaved
                        ? 'bg-linkedin/10 text-linkedin'
                        : 'bg-gray-100 dark:bg-gray-800 text-light-text-primary dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-gray-700'
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {performanceSaved ? 'Edit Performance' : 'Track Performance'}
                  </button>
                </>
              )}
              {/* Remix button - for completed/published sessions */}
              {(session.status === 'complete' || session.status === 'published') && (
                <button
                  onClick={handleRemix}
                  disabled={isCreatingRemix}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                  title="Create a remix of this session"
                >
                  {isCreatingRemix ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Remix...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Remix
                    </>
                  )}
                </button>
              )}
              {/* Delete button */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-error hover:bg-error/10 transition-colors"
                title="Delete session"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              {/* Tab buttons for mobile */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 lg:hidden">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={cn(
                    'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                    activeTab === 'chat'
                      ? 'bg-white dark:bg-gray-700 text-light-text-primary dark:text-dark-text-primary shadow-sm'
                      : 'text-light-text-secondary dark:text-dark-text-secondary'
                  )}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('output')}
                  className={cn(
                    'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                    activeTab === 'output'
                      ? 'bg-white dark:bg-gray-700 text-light-text-primary dark:text-dark-text-primary shadow-sm'
                      : 'text-light-text-secondary dark:text-dark-text-secondary'
                  )}
                >
                  Output
                </button>
              </div>
              {output && (
                <button
                  onClick={() => setShowTemplateModal(true)}
                  disabled={savedFavorites.has('template')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    savedFavorites.has('template') || copySuccess === 'template-saved'
                      ? 'bg-success/10 text-success'
                      : 'bg-gray-100 dark:bg-gray-800 text-light-text-primary dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {savedFavorites.has('template') || copySuccess === 'template-saved' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Template Saved
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                      Save as Template
                    </>
                  )}
                </button>
              )}
              {/* Export buttons */}
              {output && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportMarkdown}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-light-text-primary dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    title="Export as Markdown"
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        MD
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                    title="Export as PDF (Carousel format)"
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        PDF
                      </>
                    )}
                  </button>
                </div>
              )}
              <button
                onClick={handleGenerateContent}
                disabled={isGenerating || messages.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Content
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Split View Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Panel */}
          <div className={cn(
            'flex-1 flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-800',
            activeTab !== 'chat' && 'hidden lg:flex'
          )}>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {/* Original Idea */}
              <div className="bg-linkedin/5 border border-linkedin/20 rounded-lg p-4">
                <p className="text-xs font-medium text-linkedin mb-2">Original Idea</p>
                <p className="text-light-text-primary dark:text-dark-text-primary">
                  {session.original_idea}
                </p>
              </div>

              {/* Messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* Avatar for Assistant (left side) */}
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold shadow-md">
                      C
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl p-4 shadow-sm',
                      message.role === 'user'
                        ? 'bg-linkedin text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-light-text-primary dark:text-dark-text-primary rounded-bl-md'
                    )}
                  >
                    {/* Role label */}
                    <p className={cn(
                      'text-xs font-medium mb-1',
                      message.role === 'user' ? 'text-white/80' : 'text-linkedin'
                    )}>
                      {message.role === 'user' ? 'You' : 'Claude'}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p className={cn(
                      'text-xs mt-2',
                      message.role === 'user' ? 'text-white/60' : 'text-light-text-secondary dark:text-dark-text-secondary'
                    )}>
                      {formatRelativeTime(message.created_at)}
                    </p>
                  </div>

                  {/* Avatar for User (right side) */}
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-linkedin flex items-center justify-center text-white text-sm font-semibold shadow-md">
                      U
                    </div>
                  )}
                </div>
              ))}

              {/* Sending indicator */}
              {isSending && (
                <div className="flex justify-start gap-3">
                  {/* Claude Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold shadow-md">
                    C
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md p-4 shadow-sm">
                    <p className="text-xs font-medium mb-1 text-linkedin">Claude</p>
                    <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-linkedin rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-linkedin rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-linkedin rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Reconnecting Indicator */}
            {isReconnecting && (
              <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2 bg-warning/10">
                <div className="flex items-center gap-2 text-warning">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm font-medium">
                    Reconnecting... (Attempt {retryCount} of {MAX_RETRIES})
                  </span>
                </div>
              </div>
            )}

            {/* Connection Error with Manual Retry and Troubleshooting */}
            {error && pendingRetryMessage && !isReconnecting && (
              <div className="border-t border-gray-200 dark:border-gray-800 bg-error/5">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-error">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="font-medium">{error}</span>
                    </div>
                    <button
                      onClick={handleManualRetry}
                      disabled={isSending}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-error text-white rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry
                    </button>
                  </div>
                  {/* Troubleshooting Tips */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-sm">
                    <p className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Troubleshooting Tips:
                    </p>
                    <ul className="space-y-1 text-light-text-secondary dark:text-dark-text-secondary ml-5">
                      <li className="list-disc">Check your internet connection</li>
                      <li className="list-disc">The server may be temporarily busy - wait a moment and try again</li>
                      <li className="list-disc">Try refreshing the page if the issue persists</li>
                      <li className="list-disc">Clear browser cache if you continue to experience issues</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="input flex-1"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className="btn-primary"
                >
                  {isSending ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Output Panel */}
          <div className={cn(
            'w-full lg:w-1/2 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900',
            activeTab !== 'output' && 'hidden lg:flex'
          )}>
            {output ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Copy for LinkedIn Section */}
                <div className="bg-gradient-to-r from-linkedin to-blue-600 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-white">
                      <h3 className="font-semibold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        Copy for LinkedIn
                      </h3>
                      <p className="text-sm text-white/80 mt-1">
                        Selected: Hook {selectedHookIndex + 1} + Body + CTA {selectedCtaIndex + 1}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyForLinkedIn}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                        linkedInCopySuccess
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-linkedin hover:bg-gray-100'
                      )}
                    >
                      {linkedInCopySuccess ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy to Clipboard
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Hooks Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                      <svg className="w-5 h-5 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Hooks
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRegenerateSection('hooks')}
                        disabled={regeneratingSection !== null}
                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-linkedin/10 text-linkedin hover:bg-linkedin/20 transition-colors disabled:opacity-50"
                        title="Regenerate hooks"
                      >
                        {regeneratingSection === 'hooks' ? (
                          <>
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Regenerate
                          </>
                        )}
                      </button>
                      <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {output.hooks.length} options
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {editedHooks.map((hook, index) => (
                      <div
                        key={index}
                        className={cn(
                          'bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 transition-all cursor-pointer',
                          selectedHookIndex === index
                            ? 'border-linkedin ring-2 ring-linkedin/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-linkedin/50'
                        )}
                        onClick={() => setSelectedHookIndex(index)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                              selectedHookIndex === index
                                ? 'border-linkedin bg-linkedin'
                                : 'border-gray-400 dark:border-gray-500'
                            )}>
                              {selectedHookIndex === index && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs font-medium text-linkedin bg-linkedin/10 px-2 py-1 rounded">
                              Hook {index + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {editingHookIndex === index ? (
                              <>
                                <button
                                  onClick={() => handleSaveHook(index)}
                                  className="p-1 text-success hover:bg-success/10 rounded transition-colors"
                                  title="Save"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingHookIndex(null)
                                    setEditedHooks([...output.hooks])
                                  }}
                                  className="p-1 text-error hover:bg-error/10 rounded transition-colors"
                                  title="Cancel"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingHookIndex(index)}
                                  className="p-1 text-light-text-secondary dark:text-dark-text-secondary hover:text-linkedin hover:bg-linkedin/10 rounded transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleCopyHook(hook, index)}
                                  className={cn(
                                    'p-1 rounded transition-colors',
                                    copySuccess === `hook-${index}`
                                      ? 'text-success bg-success/10'
                                      : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-linkedin hover:bg-linkedin/10'
                                  )}
                                  title={copySuccess === `hook-${index}` ? 'Copied!' : 'Copy'}
                                >
                                  {copySuccess === `hook-${index}` ? (
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
                                  onClick={() => handleSaveToFavorites('hook', hook, index)}
                                  disabled={savedFavorites.has(`hook-${index}`)}
                                  className={cn(
                                    'p-1 rounded transition-colors',
                                    savedFavorites.has(`hook-${index}`) || copySuccess === `fav-hook-${index}`
                                      ? 'text-success bg-success/10'
                                      : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-pink-500 hover:bg-pink-500/10'
                                  )}
                                  title={savedFavorites.has(`hook-${index}`) ? 'Saved!' : 'Save to Favorites'}
                                >
                                  {savedFavorites.has(`hook-${index}`) || copySuccess === `fav-hook-${index}` ? (
                                    <svg className="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                  )}
                                </button>
                                {hook !== output.hooks_original[index] && (
                                  <button
                                    onClick={() => handleRevertHook(index)}
                                    className="p-1 text-warning hover:bg-warning/10 rounded transition-colors"
                                    title="Revert to original"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {editingHookIndex === index ? (
                          <textarea
                            value={hook}
                            onChange={(e) => {
                              const newHooks = [...editedHooks]
                              newHooks[index] = e.target.value
                              setEditedHooks(newHooks)
                            }}
                            className="w-full p-3 text-sm rounded-lg border border-linkedin/50 bg-white dark:bg-gray-800 text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-linkedin/50 resize-none"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <p className="text-light-text-primary dark:text-dark-text-primary text-sm leading-relaxed">
                            {hook}
                          </p>
                        )}
                        {hook !== output.hooks_original[index] && editingHookIndex !== index && (
                          <p className="text-xs text-warning mt-2 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edited
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body Content Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                      <svg className="w-5 h-5 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Body Content
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRegenerateSection('body')}
                        disabled={regeneratingSection !== null}
                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-linkedin/10 text-linkedin hover:bg-linkedin/20 transition-colors disabled:opacity-50"
                        title="Regenerate body content"
                      >
                        {regeneratingSection === 'body' ? (
                          <>
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Regenerate
                          </>
                        )}
                      </button>
                      {(() => {
                        const wordCount = editedBody.split(/\s+/).filter(w => w).length
                        const charCount = editedBody.length
                        const isOptimal = wordCount >= 150 && wordCount <= 300
                        const isTooShort = wordCount < 150
                        const isTooLong = wordCount > 300
                        return (
                          <>
                            <span className={cn(
                              'text-xs px-2 py-1 rounded flex items-center gap-1',
                              isOptimal && 'bg-success/10 text-success',
                              isTooShort && 'bg-warning/10 text-warning',
                              isTooLong && 'bg-error/10 text-error'
                            )}>
                              {isOptimal && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {wordCount} words
                            </span>
                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {charCount} chars
                            </span>
                            {(isTooShort || isTooLong) && (
                              <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary" title="LinkedIn optimal range: 150-300 words">
                                {isTooShort ? '(aim for 150+ words)' : '(consider trimming)'}
                              </span>
                            )}
                          </>
                        )
                      })()}
                      {isEditingBody ? (
                        <>
                          <button
                            onClick={handleSaveBody}
                            className="p-1 text-success hover:bg-success/10 rounded transition-colors"
                            title="Save"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingBody(false)
                              setEditedBody(output.body_content)
                            }}
                            className="p-1 text-error hover:bg-error/10 rounded transition-colors"
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setIsEditingBody(true)}
                            className="p-1 text-light-text-secondary dark:text-dark-text-secondary hover:text-linkedin hover:bg-linkedin/10 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCopyBody}
                            className={cn(
                              'p-1 rounded transition-colors',
                              copySuccess === 'body'
                                ? 'text-success bg-success/10'
                                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-linkedin hover:bg-linkedin/10'
                            )}
                            title={copySuccess === 'body' ? 'Copied!' : 'Copy'}
                          >
                            {copySuccess === 'body' ? (
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
                            onClick={() => handleSaveToFavorites('body', editedBody)}
                            disabled={savedFavorites.has('body')}
                            className={cn(
                              'p-1 rounded transition-colors',
                              savedFavorites.has('body') || copySuccess === 'fav-body'
                                ? 'text-success bg-success/10'
                                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-pink-500 hover:bg-pink-500/10'
                            )}
                            title={savedFavorites.has('body') ? 'Saved!' : 'Save to Favorites'}
                          >
                            {savedFavorites.has('body') || copySuccess === 'fav-body' ? (
                              <svg className="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            )}
                          </button>
                          {editedBody !== output.body_content_original && (
                            <button
                              onClick={handleRevertBody}
                              className="p-1 text-warning hover:bg-warning/10 rounded transition-colors"
                              title="Revert to original"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    {isEditingBody ? (
                      <textarea
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        className="w-full p-3 text-sm rounded-lg border border-linkedin/50 bg-white dark:bg-gray-800 text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-linkedin/50 resize-none min-h-[300px]"
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="text-light-text-primary dark:text-dark-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                          {editedBody}
                        </p>
                        {editedBody !== output.body_content_original && (
                          <p className="text-xs text-warning mt-3 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edited
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* CTAs Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                      <svg className="w-5 h-5 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      Call to Actions
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRegenerateSection('ctas')}
                        disabled={regeneratingSection !== null}
                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-linkedin/10 text-linkedin hover:bg-linkedin/20 transition-colors disabled:opacity-50"
                        title="Regenerate CTAs"
                      >
                        {regeneratingSection === 'ctas' ? (
                          <>
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Regenerate
                          </>
                        )}
                      </button>
                      <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {output.ctas.length} options
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {editedCtas.map((cta, index) => (
                      <div
                        key={index}
                        className={cn(
                          'bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 transition-all cursor-pointer',
                          selectedCtaIndex === index
                            ? 'border-linkedin ring-2 ring-linkedin/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-linkedin/50'
                        )}
                        onClick={() => setSelectedCtaIndex(index)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                              selectedCtaIndex === index
                                ? 'border-linkedin bg-linkedin'
                                : 'border-gray-400 dark:border-gray-500'
                            )}>
                              {selectedCtaIndex === index && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs font-medium text-linkedin bg-linkedin/10 px-2 py-1 rounded">
                              CTA {index + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {editingCtaIndex === index ? (
                              <>
                                <button
                                  onClick={() => handleSaveCta(index)}
                                  className="p-1 text-success hover:bg-success/10 rounded transition-colors"
                                  title="Save"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCtaIndex(null)
                                    setEditedCtas([...output.ctas])
                                  }}
                                  className="p-1 text-error hover:bg-error/10 rounded transition-colors"
                                  title="Cancel"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingCtaIndex(index)}
                                  className="p-1 text-light-text-secondary dark:text-dark-text-secondary hover:text-linkedin hover:bg-linkedin/10 rounded transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleCopyCta(cta, index)}
                                  className={cn(
                                    'p-1 rounded transition-colors',
                                    copySuccess === `cta-${index}`
                                      ? 'text-success bg-success/10'
                                      : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-linkedin hover:bg-linkedin/10'
                                  )}
                                  title={copySuccess === `cta-${index}` ? 'Copied!' : 'Copy'}
                                >
                                  {copySuccess === `cta-${index}` ? (
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
                                  onClick={() => handleSaveToFavorites('cta', cta, index)}
                                  disabled={savedFavorites.has(`cta-${index}`)}
                                  className={cn(
                                    'p-1 rounded transition-colors',
                                    savedFavorites.has(`cta-${index}`) || copySuccess === `fav-cta-${index}`
                                      ? 'text-success bg-success/10'
                                      : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-pink-500 hover:bg-pink-500/10'
                                  )}
                                  title={savedFavorites.has(`cta-${index}`) ? 'Saved!' : 'Save to Favorites'}
                                >
                                  {savedFavorites.has(`cta-${index}`) || copySuccess === `fav-cta-${index}` ? (
                                    <svg className="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                  )}
                                </button>
                                {cta !== output.ctas_original[index] && (
                                  <button
                                    onClick={() => handleRevertCta(index)}
                                    className="p-1 text-warning hover:bg-warning/10 rounded transition-colors"
                                    title="Revert to original"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {editingCtaIndex === index ? (
                          <textarea
                            value={cta}
                            onChange={(e) => {
                              const newCtas = [...editedCtas]
                              newCtas[index] = e.target.value
                              setEditedCtas(newCtas)
                            }}
                            className="w-full p-3 text-sm rounded-lg border border-linkedin/50 bg-white dark:bg-gray-800 text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-linkedin/50 resize-none"
                            rows={2}
                            autoFocus
                          />
                        ) : (
                          <p className="text-light-text-primary dark:text-dark-text-primary text-sm leading-relaxed">
                            {cta}
                          </p>
                        )}
                        {cta !== output.ctas_original[index] && editingCtaIndex !== index && (
                          <p className="text-xs text-warning mt-2 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edited
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Concepts Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                      <svg className="w-5 h-5 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Visual Concepts
                    </h2>
                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {output.visual_concepts.length} ideas
                    </span>
                  </div>
                  <div className="space-y-4">
                    {output.visual_concepts.map((concept, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-medium text-linkedin bg-linkedin/10 px-2 py-1 rounded">
                            Concept {index + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleExportPNG(index)}
                              disabled={isExporting}
                              className={cn(
                                'p-1 rounded transition-colors',
                                'text-light-text-secondary dark:text-dark-text-secondary hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
                                isExporting && 'opacity-50 cursor-not-allowed'
                              )}
                              title="Download as PNG"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleCopyHook(concept.description, index + 100)}
                              className={cn(
                                'p-1 rounded transition-colors',
                                copySuccess === `hook-${index + 100}`
                                  ? 'text-success bg-success/10'
                                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-linkedin hover:bg-linkedin/10'
                              )}
                              title={copySuccess === `hook-${index + 100}` ? 'Copied!' : 'Copy description'}
                            >
                              {copySuccess === `hook-${index + 100}` ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Visual Preview Mockup */}
                        <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-linkedin/5 to-purple-500/5">
                          <div className="aspect-video flex items-center justify-center p-4">
                            {index === 0 && (
                              // Split-screen mockup
                              <div className="w-full h-full flex rounded-lg overflow-hidden shadow-inner">
                                <div className="w-1/2 bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                  <div className="text-center">
                                    <span className="text-2xl mb-2 block opacity-50">THEN</span>
                                    <div className="w-12 h-12 mx-auto rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center">
                                      <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="w-1/2 bg-gradient-to-br from-linkedin to-purple-500 flex items-center justify-center">
                                  <div className="text-center text-white">
                                    <span className="text-2xl mb-2 block">NOW</span>
                                    <div className="w-12 h-12 mx-auto rounded-full bg-white/20 flex items-center justify-center">
                                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {index === 1 && (
                              // Carousel mockup
                              <div className="w-full h-full flex items-center justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((slide) => (
                                  <div
                                    key={slide}
                                    className={cn(
                                      'flex-shrink-0 w-16 h-20 rounded-lg flex items-center justify-center text-white text-xs font-medium shadow-md',
                                      slide === 1 && 'bg-linkedin',
                                      slide === 2 && 'bg-purple-500',
                                      slide === 3 && 'bg-pink-500',
                                      slide === 4 && 'bg-orange-500',
                                      slide === 5 && 'bg-green-500'
                                    )}
                                  >
                                    {slide === 1 ? 'Hook' : slide === 5 ? 'CTA' : `Tip ${slide - 1}`}
                                  </div>
                                ))}
                              </div>
                            )}
                            {index === 2 && (
                              // Journey/path mockup
                              <div className="w-full h-full flex items-center justify-between px-4">
                                <div className="text-center">
                                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mb-1">
                                    <span className="text-xs">1</span>
                                  </div>
                                  <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Before</span>
                                </div>
                                <div className="flex-1 h-1 bg-gradient-to-r from-gray-300 via-linkedin to-green-500 mx-2 rounded" />
                                <div className="text-center">
                                  <div className="w-10 h-10 rounded-full bg-linkedin flex items-center justify-center mb-1">
                                    <span className="text-xs text-white">2</span>
                                  </div>
                                  <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Shift</span>
                                </div>
                                <div className="flex-1 h-1 bg-gradient-to-r from-linkedin to-green-500 mx-2 rounded" />
                                <div className="text-center">
                                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mb-1">
                                    <span className="text-xs text-white">3</span>
                                  </div>
                                  <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">After</span>
                                </div>
                              </div>
                            )}
                            {index > 2 && (
                              // Generic visual placeholder
                              <div className="text-center">
                                <svg className="w-12 h-12 mx-auto text-linkedin/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">Visual Preview</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-light-text-primary dark:text-dark-text-primary text-sm leading-relaxed">
                          {concept.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linkedin/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                    No Content Generated Yet
                  </h3>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4 max-w-sm">
                    Chat with Claude to refine your idea, then click &quot;Generate Content&quot; to create hooks, body content, CTAs, and visual concepts.
                  </p>
                  <button
                    onClick={handleGenerateContent}
                    disabled={isGenerating || messages.length === 0}
                    className="btn-primary"
                  >
                    Generate Content
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Template Name Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                Save as Template
              </h3>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                Save this content plan as a reusable template. It will include all hooks, body content, CTAs, and visual concepts.
              </p>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
                className="input w-full mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowTemplateModal(false)
                    setTemplateName('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={!templateName.trim() || isSavingTemplate}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSavingTemplate ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Template'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                  Delete Session
                </h3>
              </div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                Are you sure you want to delete this session?
              </p>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                This will permanently delete:
              </p>
              <ul className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4 list-disc list-inside space-y-1">
                <li>All conversation messages</li>
                <li>Generated content (hooks, body, CTAs)</li>
                <li>Visual concepts</li>
              </ul>
              <p className="text-sm text-error mb-4">This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSession}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-error hover:bg-error/90 rounded-lg transition-colors flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Session'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Performance Notes Modal */}
        {showPerformanceForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-linkedin/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                  Track Performance
                </h3>
              </div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                Record engagement metrics for this published post to track performance over time.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
                    Views
                  </label>
                  <input
                    type="number"
                    value={performanceNotes.views}
                    onChange={(e) => setPerformanceNotes(prev => ({ ...prev, views: e.target.value }))}
                    placeholder="0"
                    className="input w-full"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
                    Likes
                  </label>
                  <input
                    type="number"
                    value={performanceNotes.likes}
                    onChange={(e) => setPerformanceNotes(prev => ({ ...prev, likes: e.target.value }))}
                    placeholder="0"
                    className="input w-full"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
                    Comments
                  </label>
                  <input
                    type="number"
                    value={performanceNotes.comments}
                    onChange={(e) => setPerformanceNotes(prev => ({ ...prev, comments: e.target.value }))}
                    placeholder="0"
                    className="input w-full"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
                    Reposts
                  </label>
                  <input
                    type="number"
                    value={performanceNotes.reposts}
                    onChange={(e) => setPerformanceNotes(prev => ({ ...prev, reposts: e.target.value }))}
                    placeholder="0"
                    className="input w-full"
                    min="0"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
                  Notes
                </label>
                <textarea
                  value={performanceNotes.notes}
                  onChange={(e) => setPerformanceNotes(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="What worked well? What could be improved?"
                  className="input w-full resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowPerformanceForm(false)}
                  disabled={isSavingPerformance}
                  className="px-4 py-2 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePerformance}
                  disabled={isSavingPerformance}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSavingPerformance ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Performance'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
