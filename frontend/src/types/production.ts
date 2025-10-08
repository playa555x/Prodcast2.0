/**
 * Production Types - Multi-Voice Podcast Production
 *
 * Frontend types for production pipeline
 */

// ============================================
// Enums
// ============================================

export enum ProductionStatus {
  VOICE_ASSIGNMENT = 'voice_assignment',
  GENERATING_SEGMENTS = 'generating_segments',
  READY_FOR_EDITING = 'ready_for_editing',
  EDITING = 'editing',
  EXPORTING = 'exporting',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ProductionSegmentType {
  SPEECH = 'speech',
  MUSIC = 'music',
  SFX = 'sfx',
  SILENCE = 'silence'
}

// ============================================
// Voice Assignment Types
// ============================================

export interface VoiceAssignment {
  character_id: string
  character_name: string
  provider: string
  voice_id: string
  voice_name: string
}

export interface VoiceAssignmentRequest {
  research_job_id: string
  selected_variant: string
  assignments: VoiceAssignment[]
}

// ============================================
// Audio Segment Types
// ============================================

export interface AudioSegment {
  segment_id: string
  segment_number: number
  segment_type: ProductionSegmentType

  // Speech
  character_id?: string
  character_name?: string
  text?: string
  voice_id?: string
  voice_name?: string
  provider?: string

  // Properties
  speed: number
  pitch?: number
  volume: number
  emotion?: string

  // Timing
  start_time: number
  duration: number
  end_time: number

  // Files
  audio_url?: string
  audio_path?: string
  waveform_url?: string

  // Music/SFX
  file_name?: string
  loop: boolean
  fade_in: number
  fade_out: number

  // Status
  status: string
  error_message?: string
}

export interface TimelineTrack {
  track_id: string
  track_name: string
  track_type: string
  track_number: number
  segments: AudioSegment[]
  muted: boolean
  solo: boolean
  volume: number
}

export interface Timeline {
  production_job_id: string
  total_duration: number
  tracks: TimelineTrack[]
  sample_rate: number
  bit_depth: number
}

// ============================================
// Request/Response Types
// ============================================

export interface StartProductionRequest {
  research_job_id: string
  selected_variant: string
}

export interface StartProductionResponse {
  production_job_id: string
  status: ProductionStatus
  research_job_id: string
  selected_variant: string
  characters: Array<{
    id: string
    name: string
    role: string
    personality: string
    expertise?: string
    speech_style: string
    dominance_level: number
  }>
  message: string
}

export interface GenerateSegmentsRequest {
  production_job_id: string
  voice_assignments: VoiceAssignment[]
}

export interface ProductionStatusResponse {
  production_job_id: string
  status: ProductionStatus
  progress_percent: number
  current_step: string
  segments_generated: number
  total_segments: number
  error_message?: string
}

export interface TimelineUpdateRequest {
  production_job_id: string
  timeline: Timeline
}

export interface ExportRequest {
  production_job_id: string
  format?: string
  quality?: string
  normalize?: boolean
  add_metadata?: boolean
  metadata?: Record<string, string>
}

export interface ExportResponse {
  production_job_id: string
  status: string
  download_url?: string
  file_size_bytes?: number
  duration_seconds?: number
  format: string
}

// ============================================
// Voice Library Types
// ============================================

export interface VoiceLibraryEntry {
  voice_id: string
  voice_name: string
  provider: string
  language?: string
  gender?: string
  preview_text: string
  preview_url?: string
  usage_count: number
  last_used?: string
  tags: string[]
  favorite: boolean
}

// ============================================
// History Types
// ============================================

export interface HistoryEntry {
  production_job_id: string
  title: string
  description?: string
  thumbnail_url?: string
  duration_seconds: number
  file_size_bytes: number
  download_url: string
  created_at: string
  shared_at?: string
  shared_platforms: string[]
  view_count: number
  download_count: number
  status: string
}
