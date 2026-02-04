'use client'

import { Fragment } from 'react'
import { Check } from 'lucide-react'
import type { WorkflowStep, Platform } from '@/types'
import { WORKFLOW_CONFIGS, STEP_LABELS } from '@/types'

interface ProgressIndicatorProps {
  currentStep: WorkflowStep
  platform: Platform
  onStepClick?: (step: WorkflowStep) => void
  completedSteps?: WorkflowStep[]
}

type StepStatus = 'completed' | 'current' | 'upcoming'

// Circle styles for each status
const circleStyles: Record<StepStatus, string> = {
  completed: 'w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm',
  current: 'w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold shadow-sm',
  upcoming: 'w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 flex items-center justify-center bg-white dark:bg-gray-800',
}

// Label styles for each status
const labelStyles: Record<StepStatus, string> = {
  completed: 'text-xs font-medium text-green-600 dark:text-green-400',
  current: 'text-xs font-semibold text-blue-600 dark:text-blue-400',
  upcoming: 'text-xs text-gray-400 dark:text-gray-500',
}

export function ProgressIndicator({
  currentStep,
  platform,
  onStepClick,
  completedSteps = [],
}: ProgressIndicatorProps) {
  const config = WORKFLOW_CONFIGS[platform]
  const steps = config.steps

  const getStepStatus = (step: WorkflowStep): StepStatus => {
    if (step === currentStep) return 'current'
    if (completedSteps.includes(step)) return 'completed'
    // Only completedSteps array determines completion status
    return 'upcoming'
  }

  // Determine line color based on whether the segment is completed
  const getLineColor = (index: number): string => {
    const currentStatus = getStepStatus(steps[index])
    const nextStatus = getStepStatus(steps[index + 1])

    // Line is green if current step is completed and we're moving to current or completed
    if (currentStatus === 'completed' && nextStatus !== 'upcoming') {
      return 'bg-green-500'
    }
    return 'bg-gray-300 dark:bg-gray-600'
  }

  return (
    <div className="w-full px-4 py-3 bg-white dark:bg-gray-800">
      <div className="flex items-center max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const status = getStepStatus(step)
          const stepNumber = index + 1
          const isLast = index === steps.length - 1
          // Setup is always clickable (for editing project details), other steps are clickable when completed
          const isClickable = step === 'setup' || status === 'completed'

          return (
            <Fragment key={step}>
              {/* Step circle + label */}
              <button
                onClick={() => {
                  if (onStepClick && isClickable) {
                    onStepClick(step)
                  }
                }}
                disabled={!isClickable}
                className={`
                  flex flex-col items-center gap-1.5 flex-shrink-0 transition-transform
                  ${isClickable ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}
                `}
              >
                <div className={circleStyles[status]}>
                  {status === 'completed' ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <span className="text-sm">{stepNumber}</span>
                  )}
                </div>
                <span className={`${labelStyles[status]} whitespace-nowrap`}>
                  {STEP_LABELS[step]}
                </span>
              </button>

              {/* Connecting line */}
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-3 ${getLineColor(index)} transition-colors`} />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressIndicator
