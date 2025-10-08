/**
 * Production Service - Multi-Voice Podcast Production
 *
 * Frontend service for production pipeline
 * Type-safe, error-handled, production-ready
 *
 * Last updated: 2025-10-06
 */

import { apiClient } from './api-client'
import { API_ENDPOINTS } from './constants'
import type {
  StartProductionRequest,
  StartProductionResponse,
  ProductionStatusResponse,
  TimelineUpdateRequest,
  ExportRequest,
  ExportResponse,
  Timeline,
  VoiceAssignment,
  Result,
  APIError
} from '@/types'

// ============================================
// Production Service
// ============================================

export const productionService = {
  /**
   * Start production from research results
   */
  async startProduction(
    request: StartProductionRequest
  ): Promise<Result<StartProductionResponse, APIError>> {
    return apiClient.post<StartProductionResponse>(
      API_ENDPOINTS.PRODUCTION_START,
      request
    )
  },

  /**
   * Generate audio segments with voice assignments
   */
  async generateSegments(
    productionJobId: string,
    voiceAssignments: VoiceAssignment[]
  ): Promise<Result<any, APIError>> {
    return apiClient.post<any>(
      API_ENDPOINTS.PRODUCTION_GENERATE_SEGMENTS,
      {
        production_job_id: productionJobId,
        voice_assignments: voiceAssignments
      }
    )
  },

  /**
   * Get production status (for polling)
   */
  async getStatus(
    productionJobId: string
  ): Promise<Result<ProductionStatusResponse, APIError>> {
    return apiClient.get<ProductionStatusResponse>(
      API_ENDPOINTS.PRODUCTION_STATUS(productionJobId)
    )
  },

  /**
   * Get timeline for editing
   */
  async getTimeline(
    productionJobId: string
  ): Promise<Result<Timeline, APIError>> {
    return apiClient.get<Timeline>(
      API_ENDPOINTS.PRODUCTION_TIMELINE(productionJobId)
    )
  },

  /**
   * Update timeline (after edits)
   */
  async updateTimeline(
    request: TimelineUpdateRequest
  ): Promise<Result<any, APIError>> {
    return apiClient.put<any>(
      API_ENDPOINTS.PRODUCTION_TIMELINE_UPDATE,
      request
    )
  },

  /**
   * Export final podcast
   */
  async exportPodcast(
    request: ExportRequest
  ): Promise<Result<ExportResponse, APIError>> {
    return apiClient.post<ExportResponse>(
      API_ENDPOINTS.PRODUCTION_EXPORT,
      request
    )
  },

  /**
   * Get status label with emoji
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'voice_assignment': '🎤 Voice Assignment',
      'generating_segments': '🎵 Generating Segments',
      'ready_for_editing': '✅ Ready for Editing',
      'editing': '✂️ Editing',
      'exporting': '📦 Exporting',
      'completed': '✅ Completed',
      'failed': '❌ Failed'
    }
    return labels[status] || status
  }
}
