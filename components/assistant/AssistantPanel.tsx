'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, Lightbulb, MessageSquare, Wand2, HelpCircle, RefreshCw, Plus, Pencil } from 'lucide-react'
import type { Message } from '@/types'

interface AssistantPanelProps {
  messages: Message[]
  onSendMessage: (message: string) => Promise<void>
  isLoading?: boolean
  suggestions?: string[]
  projectContext?: {
    topic: string
    platform: string
    currentStep: string
  }
}

// Get contextual topic reference for prompts
const getTopicRef = (topic: string) => {
  if (topic.length > 50) {
    return `this ${topic.substring(0, 30)}... content`
  }
  return `${topic}`
}

export function AssistantPanel({
  messages,
  onSendMessage,
  isLoading = false,
  suggestions = [],
  projectContext,
}: AssistantPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    await onSendMessage(message)
  }

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return
    await onSendMessage(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Default suggestions based on context
  const defaultSuggestions = [
    'Make the hooks more attention-grabbing',
    'Add more specific examples',
    'Make the tone more professional',
    'Shorten the content',
  ]

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            AI Assistant
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ask me to edit or improve your content
          </p>
        </div>
      </div>

      {/* Context Banner */}
      {projectContext && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Working on: <span className="font-medium">{projectContext.currentStep}</span> for{' '}
            <span className="font-medium">{projectContext.platform}</span>
          </p>
        </div>
      )}

      {/* Contextual Action Buttons */}
      {projectContext && projectContext.currentStep !== 'Complete' && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
          {/* Primary Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSuggestionClick(`Improve all ${projectContext.currentStep.toLowerCase()} - make them more engaging and impactful`)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Improve
            </button>
            <button
              onClick={() => handleSuggestionClick(`Explain why these ${projectContext.currentStep.toLowerCase()} work well for the topic`)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Explain
            </button>
            <button
              onClick={() => handleSuggestionClick(`Suggest 2 alternative ${projectContext.currentStep.toLowerCase()} with a different style or angle`)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Alternatives
            </button>
          </div>
          {/* Secondary Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSuggestionClick(`Add one more ${projectContext.currentStep.toLowerCase().replace(/s$/, '')} option with a unique angle`)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New
            </button>
            <button
              onClick={() => handleSuggestionClick('Edit card #1 - make it more concise and punchy')}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit #1
            </button>
            <button
              onClick={() => handleSuggestionClick('Edit card #2 - make it more concise and punchy')}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit #2
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              I can help you refine your content. Try asking me to:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left">
              <li>• Edit specific cards or sections</li>
              <li>• Improve tone or style</li>
              <li>• Add examples or details</li>
              <li>• Make content shorter or longer</li>
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[85%] rounded-2xl px-4 py-2.5 text-sm
                  ${message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                  }
                `}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Suggestions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displaySuggestions.slice(0, 4).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to edit or improve..."
              rows={1}
              className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AssistantPanel
