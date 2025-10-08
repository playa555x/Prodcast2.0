/**
 * Claude Script Generation Service
 *
 * Features:
 * - Tri-modal script generation
 * - Mode 1: Pure API
 * - Mode 2: API + Storage
 * - Mode 3: Drive-based Queue
 * - Queue status checking
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

import type { Result } from '@/types'

// ============================================
// Types
// ============================================

export type GenerationMode = 'pure_api' | 'api_storage' | 'drive_queue'
export type StorageLocation = 'desktop' | 'google_drive'
export type ScriptStyle = 'conversational' | 'formal' | 'casual' | 'interview'
export type QueueStatus = 'queued' | 'processing' | 'completed' | 'error'

export interface ClaudeScriptRequest {
  prompt: string
  mode: GenerationMode
  storage_location?: StorageLocation
  speakers_count?: number
  script_style?: ScriptStyle
}

export interface ClaudeScriptResponse {
  mode: string
  success: boolean
  script?: string
  file_path?: string
  queue_id?: string
  message: string
  timestamp: string
  cost_estimate?: string
}

export interface QueueStatusResponse {
  queue_id: string
  status: QueueStatus
  file_path?: string
  error?: string
  created_at: string
  updated_at: string
}

// ============================================
// Service Class
// ============================================

class ClaudeScriptService {
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
   * Generate Claude script (Tri-Modal)
   *
   * @param request Script generation request
   * @returns Result with script response
   */
  async generateScript(request: ClaudeScriptRequest): Promise<Result<ClaudeScriptResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/claude-script/generate-script`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          ok: false,
          error: {
            detail: errorData.detail || errorData.message || 'Script generation failed',
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
   * Check queue status (for Mode 3)
   *
   * @param queueId Queue ID to check
   * @returns Result with queue status
   */
  async checkQueueStatus(queueId: string): Promise<Result<QueueStatusResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/claude-script/queue-status/${queueId}`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          ok: false,
          error: {
            detail: errorData.detail || errorData.message || 'Failed to check queue status',
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
   * Poll queue status until completed or error
   *
   * @param queueId Queue ID to poll
   * @param intervalMs Polling interval in milliseconds
   * @param maxAttempts Maximum number of polling attempts
   * @returns Result with final queue status
   */
  async pollQueueStatus(
    queueId: string,
    intervalMs: number = 2000,
    maxAttempts: number = 60
  ): Promise<Result<QueueStatusResponse>> {
    let attempts = 0

    while (attempts < maxAttempts) {
      const result = await this.checkQueueStatus(queueId)

      if (!result.ok) {
        return result
      }

      const status = result.value.status

      // Terminal states
      if (status === 'completed' || status === 'error') {
        return result
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs))
      attempts++
    }

    // Timeout
    return {
      ok: false,
      error: {
        detail: `Queue status polling timed out after ${maxAttempts} attempts`,
        status: 408
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<Result<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/claude-script/health`)

      if (!response.ok) {
        return {
          ok: false,
          error: {
            detail: 'Health check failed',
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
   * Get configuration
   */
  async getConfiguration(): Promise<Result<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/claude-script/config`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          ok: false,
          error: {
            detail: errorData.detail || 'Failed to get configuration',
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
   * Read script file (for Mode 2)
   *
   * NOTE: This is a client-side file read, requires user to upload the file
   * @param file File object
   * @returns Script content
   */
  async readScriptFile(file: File): Promise<Result<string>> {
    try {
      const text = await file.text()
      return {
        ok: true,
        value: text
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          detail: error instanceof Error ? error.message : 'Failed to read file',
          status: 0
        }
      }
    }
  }
}

// Export singleton instance
export const claudeScriptService = new ClaudeScriptService()
