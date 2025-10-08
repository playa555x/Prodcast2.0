/**
 * Project Management Types
 *
 * Central project context for managing podcast projects across all pages.
 * Tracks project status, speakers, completion, and recommendations.
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

// ============================================
// Project Status
// ============================================

export enum ProjectStatus {
  DRAFT = 'draft',
  SCRIPT_READY = 'script_ready',
  TTS_GENERATED = 'tts_generated',
  MIXED = 'mixed',
  COMPLETED = 'completed'
}

export enum StepStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// ============================================
// Project Steps
// ============================================

export interface ProjectStep {
  id: string
  name: string
  description: string
  status: StepStatus
  completedAt?: string
  error?: string
  icon: string
}

export interface ProjectSpeaker {
  id: string
  name: string
  voice_type: string
  provider?: string
  segment_count?: number
  total_duration?: number
}

// ============================================
// Project Metadata
// ============================================

export interface ProjectMetadata {
  project_id: string
  project_name: string
  status: ProjectStatus

  // Speaker info
  speakers: ProjectSpeaker[]
  expected_speaker_count: number

  // Steps
  steps: {
    script_generation: ProjectStep
    script_upload: ProjectStep
    speaker_configuration: ProjectStep
    tts_generation: ProjectStep
    studio_mixing: ProjectStep
    export: ProjectStep
  }

  // Timestamps
  created_at: string
  updated_at: string
  completed_at?: string

  // Additional metadata
  script_style?: string
  total_duration?: number
  word_count?: number
  estimated_cost?: number

  // Files
  script_file?: string
  audio_files?: string[]
  final_export?: string

  // Recommendations
  recommendations: ProjectRecommendation[]
}

export interface ProjectRecommendation {
  id: string
  type: 'warning' | 'info' | 'success'
  title: string
  description: string
  action?: string
  actionLabel?: string
  priority: 'high' | 'medium' | 'low'
}

// ============================================
// Project Actions
// ============================================

export interface CreateProjectRequest {
  project_name: string
  expected_speaker_count: number
  script_style?: string
}

export interface UpdateProjectRequest {
  project_name?: string
  status?: ProjectStatus
  speakers?: ProjectSpeaker[]
  steps?: Partial<ProjectMetadata['steps']>
  recommendations?: ProjectRecommendation[]
}

// ============================================
// Project List
// ============================================

export interface ProjectListItem {
  project_id: string
  project_name: string
  status: ProjectStatus
  speaker_count: number
  created_at: string
  updated_at: string
  completion_percentage: number
}
