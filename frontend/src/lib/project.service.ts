/**
 * Project Service - Backend Communication
 *
 * Handles all project-related API calls.
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

import type { Result } from '@/types'
import type {
  ProjectMetadata,
  ProjectListItem,
  CreateProjectRequest,
  UpdateProjectRequest
} from '@/types/project'

// ============================================
// Service Class
// ============================================

class ProjectService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
  }

  /**
   * Get auth token from localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  }

  /**
   * Get auth headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<Result<ProjectListItem[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          ok: false,
          error: {
            detail: errorData.detail || errorData.message || 'Failed to list projects',
            status: response.status
          }
        }
      }

      const data = await response.json()
      return {
        ok: true,
        value: data
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          detail: error instanceof Error ? error.message : 'Network error',
          status: 0
        }
      }
    }
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<Result<ProjectMetadata>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          ok: false,
          error: {
            detail: errorData.detail || errorData.message || 'Failed to get project',
            status: response.status
          }
        }
      }

      const data = await response.json()
      return {
        ok: true,
        value: data
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          detail: error instanceof Error ? error.message : 'Network error',
          status: 0
        }
      }
    }
  }

  /**
   * Create new project
   */
  async createProject(request: CreateProjectRequest): Promise<Result<ProjectMetadata>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          ok: false,
          error: {
            detail: errorData.detail || errorData.message || 'Failed to create project',
            status: response.status
          }
        }
      }

      const data = await response.json()
      return {
        ok: true,
        value: data
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          detail: error instanceof Error ? error.message : 'Network error',
          status: 0
        }
      }
    }
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, request: UpdateProjectRequest): Promise<Result<ProjectMetadata>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          ok: false,
          error: {
            detail: errorData.detail || errorData.message || 'Failed to update project',
            status: response.status
          }
        }
      }

      const data = await response.json()
      return {
        ok: true,
        value: data
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          detail: error instanceof Error ? error.message : 'Network error',
          status: 0
        }
      }
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<Result<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          ok: false,
          error: {
            detail: errorData.detail || errorData.message || 'Failed to delete project',
            status: response.status
          }
        }
      }

      return {
        ok: true,
        value: undefined
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          detail: error instanceof Error ? error.message : 'Network error',
          status: 0
        }
      }
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService()
