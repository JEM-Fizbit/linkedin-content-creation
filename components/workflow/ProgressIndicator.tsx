'use client'

import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import type { WorkflowStep, Platform } from '@/types'
import { WORKFLOW_CONFIGS, STEP_LABELS } from '@/types'

interface ProgressIndicatorProps {
  currentStep: WorkflowStep
  platform: Platform
  onStepClick?: (step: WorkflowStep) => void
  completedSteps?: WorkflowStep[]
}

export function ProgressIndicator({
  currentStep,
  platform,
  onStepClick,
  completedSteps = [],
}: ProgressIndicatorProps) {
  const config = WORKFLOW_CONFIGS[platform]
  const steps = config.steps

  const currentIndex = steps.indexOf(currentStep)

  const getStepStatus = (step: WorkflowStep, index: number) => {
    if (completedSteps.includes(step)) return 'completed'
    if (step === currentStep) return 'current'
    if (index < currentIndex) return 'completed'
    return 'upcoming'
  }

  return (
    <div className="w-full px-4 py-1.5 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const status = getStepStatus(step, index)
          const isLast = index === steps.length - 1

          return (
            <div key={step} className="flex items-center flex-1">
              <button
                onClick={() => {
                  console.log('Step clicked:', step, 'status:', status)
                  if (onStepClick && status !== 'upcoming') {
                    onStepClick(step)
                  }
                }}
                disabled={status === 'upcoming'}
                className={`
                  flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-sm
                  ${status === 'current'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 cursor-default'
                    : status === 'completed'
                      ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer'
                      : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : status === 'current' ? (
                  <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                ) : (
                  <Circle className="w-4 h-4" />
                )}
                <span className={`font-medium ${status === 'upcoming' ? 'hidden md:inline' : ''}`}>
                  {STEP_LABELS[step]}
                </span>
              </button>

              {!isLast && (
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-1 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressIndicator
