/**
 * Research Types - AI-Powered Podcast Research
 *
 * Frontend types for Claude AI research system
 */

// ============================================
// Enums
// ============================================

export enum ResearchStatus {
  PENDING = 'pending',
  RESEARCHING = 'researching',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum AudienceType {
  YOUNG = 'young',
  MIDDLE_AGED = 'middle_aged',
  SCIENTIFIC = 'scientific'
}

export enum CharacterType {
  HOST = 'host',
  GUEST = 'guest',
  LISTENER = 'listener'
}

// ============================================
// Character & Persona Types
// ============================================

export interface PodcastCharacter {
  id: string
  name: string
  role: CharacterType
  personality: string
  expertise?: string
  speech_style: string
  dominance_level: number
}

export interface ConversationSegment {
  segment_number: number
  speaker_id: string
  speaker_name: string
  text: string
  duration_estimate_seconds: number
  is_spontaneous: boolean
  topic_deviation?: string
}

// ============================================
// Research Request/Response Types
// ============================================

export interface ResearchRequest {
  topic: string
  target_duration_minutes?: number
  num_guests?: number
  include_listener_topics?: boolean
  include_youtube?: boolean
  include_podcasts?: boolean
  include_scientific?: boolean
  include_everyday?: boolean
  spontaneous_deviations?: boolean
  randomness_level?: number
}

export interface ResearchSource {
  source_type: string
  title: string
  url?: string
  summary: string
  key_insights: string[]
  credibility_score: number
}

export interface ResearchResult {
  topic: string
  total_sources: number
  sources: ResearchSource[]
  key_findings: string[]
  suggested_structure: string[]
  estimated_quality_score: number
}

export interface ScriptVariant {
  audience: AudienceType
  title: string
  description: string
  characters: PodcastCharacter[]
  segments: ConversationSegment[]
  total_duration_minutes: number
  word_count: number
  tone: string
  full_script: string
}

export interface ResearchJobResponse {
  job_id: string
  status: ResearchStatus
  topic: string
  research_completed: boolean
  research_result?: ResearchResult
  variants: ScriptVariant[]
  recommended_variant: AudienceType
  recommendation_reason: string
  created_at: string
  completed_at?: string
  processing_time_seconds?: number
  output_directory?: string
  file_paths: Record<string, string>
}

export interface ResearchStatusResponse {
  job_id: string
  status: ResearchStatus
  progress_percent: number
  current_step: string
  error_message?: string
}
