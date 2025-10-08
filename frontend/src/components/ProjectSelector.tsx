/**
 * Project Selector Component
 *
 * Dropdown for selecting and managing projects.
 * Shows project name, status, speaker count, and completion.
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useProject } from '@/contexts/ProjectContext'
import { ProjectStatus } from '@/types/project'
import { Button } from '@/components'

// ============================================
// Component
// ============================================

export function ProjectSelector() {
  const {
    currentProject,
    projects,
    loadingProjects,
    selectProject,
    createProject,
    loading
  } = useProject()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectSpeakers, setNewProjectSpeakers] = useState(2)
  const [creating, setCreating] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  /**
   * Get status icon
   */
  const getStatusIcon = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.DRAFT:
        return '📝'
      case ProjectStatus.SCRIPT_READY:
        return '✅'
      case ProjectStatus.TTS_GENERATED:
        return '🔊'
      case ProjectStatus.MIXED:
        return '🎚️'
      case ProjectStatus.COMPLETED:
        return '💯'
      default:
        return '📦'
    }
  }

  /**
   * Get status color
   */
  const getStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.DRAFT:
        return 'text-gray-400'
      case ProjectStatus.SCRIPT_READY:
        return 'text-blue-400'
      case ProjectStatus.TTS_GENERATED:
        return 'text-purple-400'
      case ProjectStatus.MIXED:
        return 'text-yellow-400'
      case ProjectStatus.COMPLETED:
        return 'text-green-400'
      default:
        return 'text-gray-400'
    }
  }

  /**
   * Handle project selection
   */
  const handleSelectProject = async (projectId: string) => {
    await selectProject(projectId)
    setDropdownOpen(false)
  }

  /**
   * Handle create project
   */
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    setCreating(true)

    try {
      await createProject({
        project_name: newProjectName,
        expected_speaker_count: newProjectSpeakers
      })

      setCreateModalOpen(false)
      setNewProjectName('')
      setNewProjectSpeakers(2)
    } catch (error) {
      // Error handled by context
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      {/* Dropdown Button */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between gap-2 px-4 h-10 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border-2 border-blue-300 dark:border-blue-600 shadow-md hover:shadow-lg transition-all"
          disabled={loading}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {currentProject ? (
              <>
                <span className="text-base flex-shrink-0">{getStatusIcon(currentProject.status)}</span>
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate w-full">
                    {currentProject.project_name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {currentProject.speakers.length}/{currentProject.expected_speaker_count} speakers
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="text-base flex-shrink-0">📦</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Projekt wählen</span>
              </>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto"
            onMouseLeave={() => setDropdownOpen(false)}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Your Projects</h3>
              <Button
                size="small"
                onClick={() => {
                  setCreateModalOpen(true)
                  setDropdownOpen(false)
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                + New
              </Button>
            </div>

            {/* Project List */}
            <div className="py-2">
              {loadingProjects ? (
                <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-green-500 rounded-full" />
                  <p className="mt-2 text-sm">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  <p className="text-sm">No projects yet</p>
                  <p className="text-xs mt-1">Create your first project to get started</p>
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.project_id}
                    onClick={() => handleSelectProject(project.project_id)}
                    className={`w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left ${
                      currentProject?.project_id === project.project_id ? 'bg-gray-100 dark:bg-gray-750' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getStatusIcon(project.status)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">{project.project_name}</h4>
                          {currentProject?.project_id === project.project_id && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Active</span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <span className={getStatusColor(project.status)}>
                            {project.status.replace('_', ' ')}
                          </span>
                          <span>•</span>
                          <span>{project.speaker_count} speakers</span>
                          <span>•</span>
                          <span>{project.completion_percentage}% done</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${project.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {createModalOpen && mounted && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-[9998]"
            onClick={() => setCreateModalOpen(false)}
          />

          {/* Modal Content - Centered */}
          <div
            className="fixed left-1/2 z-[9999] w-full max-w-md px-4"
            style={{ top: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Neues Projekt erstellen</h2>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Projektname
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="z.B. KI Tech Podcast Folge 1"
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:border-green-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Erwartete Sprecher
                  </label>
                  <select
                    value={newProjectSpeakers}
                    onChange={(e) => setNewProjectSpeakers(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:border-green-500 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Sprecher' : 'Sprecher'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    💡 <strong>Tipp:</strong> Du kannst die Anzahl der Sprecher später ändern.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creating}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || creating}
                  loading={creating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {creating ? 'Erstelle...' : 'Projekt erstellen'}
                </Button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </>
  )
}
