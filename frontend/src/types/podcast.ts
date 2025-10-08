/**
 * Podcast Types - Synced with Backend Models
 * Backend: models/podcast.py
 * 
 * CRITICAL: These types MUST match Backend DTOs exactly!
 * Last synced: 2025-10-06
 */

// ============================================
// Enums (matching Backend)
// ============================================

export enum PodcastStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum SegmentType {
  INTRO = 'intro',
  MAIN = 'main',
  OUTRO = 'outro',
  TRANSITION = 'transition'
}

// ============================================
// Podcast Types (matching Backend DTOs)
// ============================================

export interface PodcastSegment {
  segmentNumber: number
  segmentType: SegmentType
  text: string
  characterCount: number
  estimatedDurationSeconds: number
}

export interface PodcastPreviewRequest {
  scriptText: string // min 100, max 500000 chars
}

export interface PodcastPreviewResponse {
  totalSegments: number
  totalCharacters: number
  estimatedDurationMinutes: number
  estimatedCostUsd: number
  segments: PodcastSegment[]
}

export interface PodcastGenerateRequest {
  scriptText: string // min 100, max 500000 chars
  provider: string
  voice: string
  speed?: number // 0.25 to 4.0, default 1.0
  includeIntro?: boolean // default true
  includeOutro?: boolean // default true
}

export interface PodcastGenerateResponse {
  jobId: string
  status: PodcastStatus
  totalSegments: number
  estimatedDurationMinutes: number
}

export interface PodcastStatusResponse {
  jobId: string
  status: PodcastStatus
  progressPercent: number
  currentSegment: number | null
  totalSegments: number
  completedSegments: number
  downloadUrl: string | null
  errorMessage: string | null
}

// ============================================
// Type Guards
// ============================================

export const isPodcastPreviewResponse = (obj: any): obj is PodcastPreviewResponse => {
  return (
    typeof obj === 'object' &&
    typeof obj.totalSegments === 'number' &&
    typeof obj.totalCharacters === 'number' &&
    Array.isArray(obj.segments)
  )
}

export const isPodcastStatusResponse = (obj: any): obj is PodcastStatusResponse => {
  return (
    typeof obj === 'object' &&
    typeof obj.jobId === 'string' &&
    Object.values(PodcastStatus).includes(obj.status) &&
    typeof obj.progressPercent === 'number'
  )
}
