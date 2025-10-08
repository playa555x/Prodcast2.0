/**
 * TTS Service - Text-to-Speech API Calls
 * 
 * All TTS-related API interactions
 * Type-safe, error-handled, production-ready
 * 
 * Last updated: 2025-10-06
 */

import { apiClient } from './api-client'
import { API_ENDPOINTS, TTS_COST_PER_CHAR, TTS_CHARS_PER_SECOND } from './constants'
import type {
  AudioGenerateRequest,
  AudioGenerateResponse,
  ProviderInfo,
  VoiceInfo,
  TTSProvider,
  Result,
  APIError
} from '@/types'

// ============================================
// TTS Service
// ============================================

export const ttsService = {
  /**
   * Generate audio from text
   */
  async generateAudio(
    request: AudioGenerateRequest
  ): Promise<Result<AudioGenerateResponse, APIError>> {
    return apiClient.post<AudioGenerateResponse>(
      API_ENDPOINTS.TTS_GENERATE,
      request
    )
  },

  /**
   * Get all available TTS providers
   */
  async getProviders(): Promise<Result<ProviderInfo[], APIError>> {
    return apiClient.get<ProviderInfo[]>(API_ENDPOINTS.TTS_PROVIDERS)
  },

  /**
   * Validate text length before generation
   */
  validateText(text: string, maxLength: number = 100000): {
    valid: boolean
    error?: string
  } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Text cannot be empty' }
    }

    if (text.length > maxLength) {
      return {
        valid: false,
        error: `Text exceeds maximum length of ${maxLength} characters`
      }
    }

    return { valid: true }
  },

  /**
   * Estimate cost for text generation
   */
  estimateCost(text: string, costPerChar: number = TTS_COST_PER_CHAR): number {
    return text.length * costPerChar
  },

  /**
   * Estimate duration (rough approximation based on speech rate)
   */
  estimateDuration(text: string): number {
    return text.length / TTS_CHARS_PER_SECOND
  },

  /**
   * Get available voices for a specific provider with optional filters
   *
   * For ElevenLabs: Returns filtered voices dynamically from API (filters applied server-side)
   * For others: Returns static voice lists
   *
   * @param provider - TTS provider
   * @param filters - Optional filters (language, gender, category)
   */
  async getVoices(
    provider: TTSProvider,
    filters?: {
      language?: string
      gender?: string
      category?: string
    }
  ): Promise<Result<VoiceInfo[], APIError>> {
    const params = new URLSearchParams()
    if (filters?.language) params.append('language', filters.language)
    if (filters?.gender) params.append('gender', filters.gender)
    if (filters?.category) params.append('category', filters.category)

    const url = `${API_ENDPOINTS.TTS_VOICES(provider)}${params.toString() ? `?${params.toString()}` : ''}`
    return await apiClient.get<VoiceInfo[]>(url)
  }
}
