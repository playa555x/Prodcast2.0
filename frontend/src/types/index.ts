/**
 * Types Index - Central Export
 * 
 * Import all types from one place:
 * import { User, TTSProvider, PodcastStatus } from '@/types'
 */

// User Types
export * from './user'

// Audio/TTS Types
export * from './audio'

// Podcast Types
export * from './podcast'

// AI Research Types
export * from './research'

// Production Pipeline Types
export * from './production'

// ============================================
// Common API Types
// ============================================

export interface APIError {
  detail: string
  statusCode?: number
  timestamp?: string
}

export interface APISuccess<T = any> {
  success: true
  data: T
  message?: string
}

export interface APIFailure {
  success: false
  error: APIError
}

export type APIResponse<T = any> = APISuccess<T> | APIFailure

// ============================================
// Result Type (for internal error handling)
// ============================================

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export const Ok = <T, E = Error>(value: T): Result<T, E> => ({ ok: true, value })
export const Err = <E = Error>(error: E): Result<never, E> => ({ ok: false, error })
