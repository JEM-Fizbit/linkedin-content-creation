'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, Image, FileText, MessageCircle, Target, Sparkles, Globe, Download } from 'lucide-react'
import type { Project, Output, VisualConcept, Citation, Platform } from '@/types'
import { WORKFLOW_CONFIGS, STEP_LABELS } from '@/types'

interface CompleteSummaryProps {
  project: Project
  output: Output
  onNavigateToStep: (step: string) => void
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  onEdit?: () => void
}

function Section({ title, icon, children, defaultExpanded = false, onEdit }: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            {icon}
          </div>
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Edit
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-800">
          {children}
        </div>
      )}
    </div>
  )
}

export function CompleteSummary({ project, output, onNavigateToStep }: CompleteSummaryProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const config = WORKFLOW_CONFIGS[project.platform]

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const selectedHook = output.hooks[output.selected_hook_index] || ''
  const selectedIntro = output.intros[output.selected_intro_index] || ''
  const selectedTitle = output.titles[output.selected_title_index] || ''
  const selectedCta = output.selected_cta_index === -1 ? null : output.ctas[output.selected_cta_index]
  const selectedVisual = output.visual_concepts[output.selected_visual_index]
  const bodyContent = output.body_content || ''

  const isYouTube = project.platform === 'youtube'

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Success Header */}
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Project Complete!
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Your {project.platform} content is ready. Review and export below.
        </p>
      </div>

      {/* Project Info */}
      <Section
        title="Project Details"
        icon={<Target className="w-5 h-5" />}
        defaultExpanded
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Topic</div>
            <p className="text-gray-900 dark:text-white">{project.topic}</p>
          </div>
          {project.target_audience && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Target Audience</div>
              <p className="text-gray-900 dark:text-white">{project.target_audience}</p>
            </div>
          )}
          {project.content_style && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Content Style</div>
              <p className="text-gray-900 dark:text-white">{project.content_style}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Hook */}
      {config.steps.includes('hooks') && (
        <Section
          title="Selected Hook"
          icon={<Sparkles className="w-5 h-5" />}
          onEdit={() => onNavigateToStep('hooks')}
          defaultExpanded
        >
          <div className="relative group">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pr-10">
              {selectedHook || 'No hook selected'}
            </p>
            {selectedHook && (
              <button
                onClick={() => handleCopy(selectedHook, 'hook')}
                className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Copy"
              >
                {copiedField === 'hook' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Title (YouTube) */}
      {isYouTube && config.steps.includes('titles') && (
        <Section
          title="Selected Title"
          icon={<FileText className="w-5 h-5" />}
          onEdit={() => onNavigateToStep('titles')}
          defaultExpanded
        >
          <div className="relative group">
            <p className="text-gray-700 dark:text-gray-300 font-medium pr-10">
              {selectedTitle || 'No title selected'}
            </p>
            {selectedTitle && (
              <button
                onClick={() => handleCopy(selectedTitle, 'title')}
                className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Copy"
              >
                {copiedField === 'title' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Intro (YouTube) */}
      {isYouTube && config.steps.includes('intros') && (
        <Section
          title="Selected Intro"
          icon={<MessageCircle className="w-5 h-5" />}
          onEdit={() => onNavigateToStep('intros')}
        >
          <div className="relative group">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pr-10">
              {selectedIntro || 'No intro selected'}
            </p>
            {selectedIntro && (
              <button
                onClick={() => handleCopy(selectedIntro, 'intro')}
                className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Copy"
              >
                {copiedField === 'intro' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Body Content (LinkedIn/Facebook) */}
      {!isYouTube && config.steps.includes('body') && (
        <Section
          title="Body Content"
          icon={<FileText className="w-5 h-5" />}
          onEdit={() => onNavigateToStep('body')}
        >
          <div className="relative group">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pr-10 max-h-[300px] overflow-auto">
              {bodyContent || 'No body content'}
            </p>
            {bodyContent && (
              <button
                onClick={() => handleCopy(bodyContent, 'body')}
                className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Copy"
              >
                {copiedField === 'body' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* CTA (LinkedIn/Facebook) */}
      {!isYouTube && config.steps.includes('ctas') && (
        <Section
          title="Call to Action"
          icon={<MessageCircle className="w-5 h-5" />}
          onEdit={() => onNavigateToStep('ctas')}
        >
          <div className="relative group">
            {selectedCta ? (
              <>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pr-10">
                  {selectedCta}
                </p>
                <button
                  onClick={() => handleCopy(selectedCta, 'cta')}
                  className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Copy"
                >
                  {copiedField === 'cta' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">No CTA (skipped)</p>
            )}
          </div>
        </Section>
      )}

      {/* Visual/Thumbnail */}
      {(config.steps.includes('visuals') || config.steps.includes('thumbnails')) && (
        <Section
          title={isYouTube ? 'Selected Thumbnail' : 'Selected Visual'}
          icon={<Image className="w-5 h-5" />}
          onEdit={() => onNavigateToStep(isYouTube ? 'thumbnails' : 'visuals')}
        >
          {selectedVisual ? (
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">{selectedVisual.description}</p>
              {selectedVisual.preview_data && (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <img
                    src={selectedVisual.preview_data}
                    alt="Visual concept"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No visual selected</p>
          )}
        </Section>
      )}

      {/* Research Sources */}
      {Array.isArray(output.citations) && output.citations.length > 0 && (
        <Section
          title="Research Sources"
          icon={<Globe className="w-5 h-5" />}
        >
          <div className="space-y-2">
            {output.citations.map((citation, idx) => (
              <a
                key={idx}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              >
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                  {citation.title || citation.url}
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Export Actions */}
      <div className="flex flex-wrap gap-3 justify-center pt-4">
        <button
          onClick={async () => {
            const fullContent = [
              selectedHook,
              isYouTube ? selectedTitle : '',
              isYouTube ? selectedIntro : bodyContent,
              selectedCta || '',
            ].filter(Boolean).join('\n\n')
            await navigator.clipboard.writeText(fullContent)
            setCopiedField('all')
            setTimeout(() => setCopiedField(null), 2000)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {copiedField === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copiedField === 'all' ? 'Copied!' : 'Copy All Text'}
        </button>
      </div>
    </div>
  )
}

export default CompleteSummary
