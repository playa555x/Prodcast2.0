/**
 * Project Status Panel Component
 *
 * Shows current project status, steps completion, and recommendations.
 * Displays in Dashboard main page.
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

'use client'

import { useProject } from '@/contexts/ProjectContext'
import { StepStatus } from '@/types/project'
import { Button, Card } from '@/components'
import { useRouter } from 'next/navigation'

// ============================================
// Component
// ============================================

export function ProjectStatusPanel() {
  const { currentProject, loading } = useProject()
  const router = useRouter()

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </Card>
    )
  }

  if (!currentProject) {
    return (
      <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Project Selected</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create or select a project to start your podcast production
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Use the project selector in the header to get started
          </p>
        </div>
      </Card>
    )
  }

  /**
   * Get step icon and color
   */
  const getStepStatusDisplay = (status: StepStatus) => {
    switch (status) {
      case StepStatus.COMPLETED:
        return { icon: '✅', color: 'text-green-400', bgColor: 'bg-green-900/20' }
      case StepStatus.IN_PROGRESS:
        return { icon: '🔄', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' }
      case StepStatus.ERROR:
        return { icon: '❌', color: 'text-red-400', bgColor: 'bg-red-900/20' }
      default:
        return { icon: '⏸️', color: 'text-gray-400', bgColor: 'bg-gray-800' }
    }
  }

  const steps = [
    currentProject.steps.script_generation,
    currentProject.steps.speaker_configuration,
    currentProject.steps.tts_generation,
    currentProject.steps.studio_mixing,
    currentProject.steps.export
  ]

  const completedSteps = steps.filter(s => s.status === StepStatus.COMPLETED).length
  const totalSteps = steps.length
  const completionPercent = Math.round((completedSteps / totalSteps) * 100)

  return (
    <Card>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentProject.project_name}</h2>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {completedSteps}/{totalSteps} Steps
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">{completionPercent}% Complete</div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-6">
        {steps.map((step, index) => {
          const display = getStepStatusDisplay(step.status)

          return (
            <div
              key={step.id}
              className={`p-3 rounded-lg border ${
                step.status === StepStatus.COMPLETED
                  ? 'border-green-300 dark:border-green-700 bg-green-100/50 dark:bg-green-900/10'
                  : step.status === StepStatus.IN_PROGRESS
                  ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-100/50 dark:bg-yellow-900/10'
                  : step.status === StepStatus.ERROR
                  ? 'border-red-300 dark:border-red-700 bg-red-100/50 dark:bg-red-900/10'
                  : 'border-gray-300 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{step.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{step.name}</h4>
                    <span className={`text-sm ${display.color}`}>{display.icon}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{step.description}</p>
                  {step.completed_at && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Completed {new Date(step.completed_at).toLocaleDateString()}
                    </p>
                  )}
                  {step.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      ⚠️ Error: {step.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Speakers Info */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Speakers</h3>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentProject.speakers.length} / {currentProject.expected_speaker_count}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {currentProject.speakers.length < currentProject.expected_speaker_count
              ? `${currentProject.expected_speaker_count - currentProject.speakers.length} more needed`
              : 'All configured'}
          </span>
        </div>
      </div>

      {/* Recommendations */}
      {currentProject.recommendations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📌 Recommendations</h3>
          {currentProject.recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-3 rounded-lg border ${
                rec.type === 'warning'
                  ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-100/50 dark:bg-yellow-900/10'
                  : rec.type === 'success'
                  ? 'border-green-300 dark:border-green-700 bg-green-100/50 dark:bg-green-900/10'
                  : 'border-blue-300 dark:border-blue-700 bg-blue-100/50 dark:bg-blue-900/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">{rec.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{rec.description}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    rec.priority === 'high'
                      ? 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'
                      : 'bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  {rec.priority}
                </span>
              </div>
              {rec.action && rec.action_label && (
                <Button
                  size="small"
                  onClick={() => router.push(rec.action!)}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  {rec.action_label} →
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Recommendations */}
      {currentProject.recommendations.length === 0 && completionPercent === 100 && (
        <div className="p-4 bg-green-100/50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-center">
          <span className="text-4xl mb-2 block">🎉</span>
          <p className="text-green-700 dark:text-green-400 font-semibold">Project Complete!</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">All steps finished successfully</p>
        </div>
      )}
    </Card>
  )
}
