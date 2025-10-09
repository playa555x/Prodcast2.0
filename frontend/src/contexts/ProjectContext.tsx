/**
 * Project Context - Global Project State Management
 *
 * Provides global project state across all pages.
 * Manages current project, project list, and project operations.
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { ProjectMetadata, ProjectListItem, CreateProjectRequest, UpdateProjectRequest } from '@/types/project'
import { projectService } from '@/lib/project.service'

// ============================================
// Context Types
// ============================================

interface ProjectContextValue {
  // Current project
  currentProject: ProjectMetadata | null
  setCurrentProject: (project: ProjectMetadata | null) => void

  // Project list
  projects: ProjectListItem[]
  loadingProjects: boolean

  // Operations
  createProject: (request: CreateProjectRequest) => Promise<void>
  updateProject: (projectId: string, request: UpdateProjectRequest) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  selectProject: (projectId: string) => Promise<void>
  refreshProjects: () => Promise<void>
  refreshCurrentProject: () => Promise<void>

  // Loading states
  loading: boolean
  error: string | null
}

// ============================================
// Context Creation
// ============================================

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

// ============================================
// Provider Component
// ============================================

interface ProjectProviderProps {
  children: ReactNode
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [currentProject, setCurrentProject] = useState<ProjectMetadata | null>(null)
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load projects on mount
  useEffect(() => {
    refreshProjects()
  }, [])

  // Load current project from localStorage on mount
  useEffect(() => {
    const savedProjectId = localStorage.getItem('current_project_id')
    if (savedProjectId) {
      selectProject(savedProjectId)
    }
  }, [])

  /**
   * Refresh project list
   */
  const refreshProjects = async () => {
    setLoadingProjects(true)
    setError(null)

    try {
      const result = await projectService.listProjects()

      if (result.ok) {
        setProjects(result.value)
      } else {
        // @ts-ignore - Result error type
        setError(result.error.detail)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoadingProjects(false)
    }
  }

  /**
   * Refresh current project
   */
  const refreshCurrentProject = async () => {
    if (!currentProject) return

    setLoading(true)
    setError(null)

    try {
      const result = await projectService.getProject(currentProject.project_id)

      if (result.ok) {
        setCurrentProject(result.value)
      } else {
        // @ts-ignore - Result error type
        setError(result.error.detail)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh project')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Select a project
   */
  const selectProject = async (projectId: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await projectService.getProject(projectId)

      if (result.ok) {
        setCurrentProject(result.value)
        localStorage.setItem('current_project_id', projectId)
      } else {
        // @ts-ignore - Result error type
        setError(result.error.detail)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select project')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create new project
   */
  const createProject = async (request: CreateProjectRequest) => {
    setLoading(true)
    setError(null)

    try {
      const result = await projectService.createProject(request)

      if (result.ok) {
        // Refresh project list
        await refreshProjects()

        // Auto-select new project
        setCurrentProject(result.value)
        localStorage.setItem('current_project_id', result.value.project_id)
      } else {
        // @ts-ignore - Result error type
        setError(result.error.detail)
        // @ts-ignore - Result error type
        throw new Error(result.error.detail)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update project
   */
  const updateProject = async (projectId: string, request: UpdateProjectRequest) => {
    setLoading(true)
    setError(null)

    try {
      const result = await projectService.updateProject(projectId, request)

      if (result.ok) {
        // Update current project if it's the one being updated
        if (currentProject?.project_id === projectId) {
          setCurrentProject(result.value)
        }

        // Refresh project list
        await refreshProjects()
      } else {
        // @ts-ignore - Result error type
        setError(result.error.detail)
        // @ts-ignore - Result error type
        throw new Error(result.error.detail)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * Delete project
   */
  const deleteProject = async (projectId: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await projectService.deleteProject(projectId)

      if (result.ok) {
        // Clear current project if it's the one being deleted
        if (currentProject?.project_id === projectId) {
          setCurrentProject(null)
          localStorage.removeItem('current_project_id')
        }

        // Refresh project list
        await refreshProjects()
      } else {
        // @ts-ignore - Result error type
        setError(result.error.detail)
        // @ts-ignore - Result error type
        throw new Error(result.error.detail)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const value: ProjectContextValue = {
    currentProject,
    setCurrentProject,
    projects,
    loadingProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
    refreshProjects,
    refreshCurrentProject,
    loading,
    error
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

// ============================================
// Hook
// ============================================

export function useProject() {
  const context = useContext(ProjectContext)

  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }

  return context
}
