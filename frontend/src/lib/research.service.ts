/**
 * Research Service - AI-Powered Podcast Research
 *
 * Frontend service for Claude AI research system
 * Type-safe, error-handled, production-ready
 *
 * Last updated: 2025-10-06
 */

import { apiClient } from './api-client'
import { API_ENDPOINTS } from './constants'
import type {
  ResearchRequest,
  ResearchJobResponse,
  ResearchStatusResponse,
  Result,
  APIError
} from '@/types'

// ============================================
// Research Service
// ============================================

export const researchService = {
  /**
   * Start AI-powered podcast research
   */
  async startResearch(
    request: ResearchRequest
  ): Promise<Result<ResearchJobResponse, APIError>> {
    return apiClient.post<ResearchJobResponse>(
      API_ENDPOINTS.RESEARCH_START,
      request
    )
  },

  /**
   * Get research job status (for polling)
   */
  async getStatus(
    jobId: string
  ): Promise<Result<ResearchStatusResponse, APIError>> {
    return apiClient.get<ResearchStatusResponse>(
      API_ENDPOINTS.RESEARCH_STATUS(jobId)
    )
  },

  /**
   * Get complete research results
   */
  async getResult(
    jobId: string
  ): Promise<Result<ResearchJobResponse, APIError>> {
    return apiClient.get<ResearchJobResponse>(
      API_ENDPOINTS.RESEARCH_RESULT(jobId)
    )
  },

  /**
   * Validate research request
   */
  validateRequest(request: Partial<ResearchRequest>): {
    valid: boolean
    error?: string
  } {
    if (!request.topic || request.topic.trim().length < 3) {
      return { valid: false, error: 'Topic must be at least 3 characters' }
    }

    if (request.topic.length > 500) {
      return { valid: false, error: 'Topic too long (max 500 characters)' }
    }

    if (request.target_duration_minutes) {
      if (request.target_duration_minutes < 30 || request.target_duration_minutes > 60) {
        return { valid: false, error: 'Duration must be between 30 and 60 minutes' }
      }
    }

    if (request.num_guests !== undefined) {
      if (request.num_guests < 0 || request.num_guests > 3) {
        return { valid: false, error: 'Number of guests must be 0-3' }
      }
    }

    if (request.randomness_level !== undefined) {
      if (request.randomness_level < 0 || request.randomness_level > 1) {
        return { valid: false, error: 'Randomness level must be 0-1' }
      }
    }

    return { valid: true }
  },

  /**
   * Get audience label
   */
  getAudienceLabel(audience: string): string {
    const labels: Record<string, string> = {
      'young': 'Junge (15-25)',
      'middle_aged': 'Mittelalte (30-50)',
      'scientific': 'Wissenschaftler/Experten'
    }
    return labels[audience] || audience
  },

  /**
   * Get status label with emoji
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': '⏳ Wartend',
      'researching': '🔍 Recherchiert',
      'analyzing': '🧠 Analysiert',
      'generating': '✨ Generiert Scripts',
      'completed': '✅ Abgeschlossen',
      'failed': '❌ Fehlgeschlagen'
    }
    return labels[status] || status
  }
}
