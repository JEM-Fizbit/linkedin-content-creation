'use client'

import { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, RefreshCw, Plus } from 'lucide-react'
import type { WorkflowStep, Platform } from '@/types'
import { WORKFLOW_CONFIGS, STEP_LABELS } from '@/types'

interface StepContainerProps {
  currentStep: WorkflowStep
  platform: Platform
  title?: string
  description?: string
  children: ReactNode
  onNext?: () => void
  onPrevious?: () => void
  onRegenerate?: () => void
  onAddMore?: () => void
  isLoading?: boolean
  canProceed?: boolean
  showAddMore?: boolean
}

export function StepContainer({
  currentStep,
  platform,
  title,
  description,
  children,
  onNext,
  onPrevious,
  onRegenerate,
  onAddMore,
  isLoading = false,
  canProceed = true,
  showAddMore = true,
}: StepContainerProps) {
  const config = WORKFLOW_CONFIGS[platform]
  const steps = config.steps.filter((step): step is Exclude<WorkflowStep, 'complete'> => step !== 'complete')
  const currentIndex = steps.indexOf(currentStep as Exclude<WorkflowStep, 'complete'>)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === steps.length - 1

  const displayTitle = title || STEP_LABELS[currentStep]

  return (
    <div className="flex flex-col h-full">
      {/* Step Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {displayTitle}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerate All
              </button>
            )}

            {showAddMore && onAddMore && (
              <button
                onClick={onAddMore}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add More
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>

      {/* Step Navigation */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={isFirstStep || isLoading}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${isFirstStep
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={onNext}
            disabled={!canProceed || isLoading}
            className={`
              flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors
              ${canProceed
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isLastStep ? 'Complete' : 'Next Step'}
            {!isLastStep && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StepContainer
