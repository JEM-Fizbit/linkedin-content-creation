'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import type { Session } from '@/types'

export default function NewSessionPage() {
  const router = useRouter()
  const [idea, setIdea] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!idea.trim()) {
      setError('Please enter your post idea')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ original_idea: idea.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const session: Session = await response.json()
      router.push(`/session/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sessions={[]} onRefresh={() => {}} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
              Start a New Post
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">
              Share your rough idea and let AI help you craft the perfect LinkedIn post.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="idea"
                className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2"
              >
                What&apos;s your post idea?
              </label>
              <textarea
                id="idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="E.g., I want to share my experience transitioning from engineering to product management..."
                className="textarea h-40"
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
                Be as detailed or as brief as you like. You can refine the idea through conversation.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-error/10 text-error rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting || !idea.trim()}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Start Session'
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Tips */}
          <div className="mt-12 p-6 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-xl">
            <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
              Tips for great LinkedIn posts
            </h2>
            <ul className="space-y-3 text-sm text-light-text-secondary dark:text-dark-text-secondary">
              <li className="flex gap-2">
                <span className="text-linkedin">1.</span>
                <span>Start with a hook that grabs attention in the first line</span>
              </li>
              <li className="flex gap-2">
                <span className="text-linkedin">2.</span>
                <span>Share personal stories or experiences for authenticity</span>
              </li>
              <li className="flex gap-2">
                <span className="text-linkedin">3.</span>
                <span>Keep paragraphs short (1-2 sentences) for mobile readability</span>
              </li>
              <li className="flex gap-2">
                <span className="text-linkedin">4.</span>
                <span>End with a clear call-to-action or question</span>
              </li>
              <li className="flex gap-2">
                <span className="text-linkedin">5.</span>
                <span>Aim for 150-300 words for optimal engagement</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
