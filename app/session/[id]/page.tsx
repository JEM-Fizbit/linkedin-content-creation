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
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch session data
  useEffect(() => {
    fetchSession()
    fetchAllSessions()
    fetchOutput()
  }, [sessionId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize edited hooks and CTAs when output changes
  useEffect(() => {
    if (output) {
      setEditedHooks([...output.hooks])
      setEditedCtas([...output.ctas])
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    const userMessage = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Replace temp message with real one and add assistant response
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempUserMessage.id)
        return [...withoutTemp, data.userMessage, data.assistantMessage]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
    } finally {
      setIsSending(false)
    }
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

  const handleRevertHook = (index: number) => {
    if (!output) return
    const newHooks = [...editedHooks]
    newHooks[index] = output.hooks_original[index]
    setEditedHooks(newHooks)
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

  const handleRevertCta = (index: number) => {
    if (!output) return
    const newCtas = [...editedCtas]
    newCtas[index] = output.ctas_original[index]
    setEditedCtas(newCtas)
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
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                {/* Hooks Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                      <svg className="w-5 h-5 text-linkedin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Hooks
                    </h2>
                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {output.hooks.length} options
                    </span>
                  </div>
                  <div className="space-y-4">
                    {editedHooks.map((hook, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium text-linkedin bg-linkedin/10 px-2 py-1 rounded">
                            Hook {index + 1}
                          </span>
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
                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {output.body_content.split(/\s+/).length} words
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-light-text-primary dark:text-dark-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                      {output.body_content}
                    </p>
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
                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {output.ctas.length} options
                    </span>
                  </div>
                  <div className="space-y-4">
                    {editedCtas.map((cta, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium text-linkedin bg-linkedin/10 px-2 py-1 rounded">
                            CTA {index + 1}
                          </span>
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
                  <div className="space-y-3">
                    {output.visual_concepts.map((concept, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                      >
                        <span className="text-xs font-medium text-linkedin bg-linkedin/10 px-2 py-1 rounded mb-2 inline-block">
                          Concept {index + 1}
                        </span>
                        <p className="text-light-text-primary dark:text-dark-text-primary text-sm leading-relaxed mt-2">
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
                    Chat with Claude to refine your idea, then click "Generate Content" to create hooks, body content, CTAs, and visual concepts.
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
      </main>
    </div>
  )
}
