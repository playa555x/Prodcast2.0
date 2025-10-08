/**
 * Podcast Service - Podcast Generation API Calls
 * 
 * All podcast-related API interactions
 * Type-safe, error-handled, production-ready
 * 
 * Last updated: 2025-10-06
 */

import { apiClient } from './api-client'
import { API_ENDPOINTS } from './constants'
import type {
  PodcastPreviewRequest,
  PodcastPreviewResponse,
  PodcastGenerateRequest,
  PodcastGenerateResponse,
  PodcastStatusResponse,
  Result,
  APIError
} from '@/types'

// ============================================
// Podcast Service
// ============================================

export const podcastService = {
  /**
   * Generate podcast preview/analysis
   */
  async preview(
    request: PodcastPreviewRequest
  ): Promise<Result<PodcastPreviewResponse, APIError>> {
    return apiClient.post<PodcastPreviewResponse>(
      API_ENDPOINTS.PODCAST_PREVIEW,
      request
    )
  },

  /**
   * Start podcast generation job
   */
  async generate(
    request: PodcastGenerateRequest
  ): Promise<Result<PodcastGenerateResponse, APIError>> {
    return apiClient.post<PodcastGenerateResponse>(
      API_ENDPOINTS.PODCAST_GENERATE,
      request
    )
  },

  /**
   * Get podcast job status
   */
  async getStatus(jobId: string): Promise<Result<PodcastStatusResponse, APIError>> {
    return apiClient.get<PodcastStatusResponse>(
      API_ENDPOINTS.PODCAST_STATUS(jobId)
    )
  },

  /**
   * Get download URL for completed podcast
   */
  getDownloadUrl(jobId: string): string {
    return `${apiClient['baseURL']}${API_ENDPOINTS.PODCAST_DOWNLOAD(jobId)}`
  },

  /**
   * Validate script text before generation
   */
  validateScript(text: string): {
    valid: boolean
    error?: string
  } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Script cannot be empty' }
    }

    if (text.length < 100) {
      return {
        valid: false,
        error: 'Script must be at least 100 characters'
      }
    }

    if (text.length > 500000) {
      return {
        valid: false,
        error: 'Script exceeds maximum length of 500,000 characters'
      }
    }

    return { valid: true }
  },

  /**
   * Poll for job completion
   * Returns a promise that resolves when job is completed or failed
   */
  async pollUntilComplete(
    jobId: string,
    intervalMs: number = 5000,
    maxAttempts: number = 120 // 10 minutes max
  ): Promise<Result<PodcastStatusResponse, APIError>> {
    let attempts = 0

    return new Promise((resolve) => {
      const poll = async () => {
        attempts++

        const result = await this.getStatus(jobId)

        if (!result.ok) {
          resolve(result)
          return
        }

        const status = result.value.status

        // Terminal states
        if (status === 'completed' || status === 'failed') {
          resolve(result)
          return
        }

        // Max attempts reached
        if (attempts >= maxAttempts) {
          resolve({
            ok: false,
            error: {
              detail: 'Polling timeout - job took too long',
              statusCode: 408
            }
          })
          return
        }

        // Continue polling
        setTimeout(poll, intervalMs)
      }

      poll()
    })
  }
}
