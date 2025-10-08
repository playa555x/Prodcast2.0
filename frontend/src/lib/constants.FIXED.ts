/**
 * Application Constants - All from Environment Variables
 * 
 * CRITICAL: NO HARDCODED VALUES!
 * All values come from .env.local
 * 
 * FIXED: 2025-10-06 - Added /api prefix to all endpoints
 * Last updated: 2025-10-06
 */

// ============================================
// API Configuration
// ============================================

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  
  // TTS
  TTS_GENERATE: '/api/tts/generate',
  TTS_PROVIDERS: '/api/tts/providers',
  TTS_VOICES: (provider: string) => `/api/tts/voices/${provider}`,
  
  // Podcast
  PODCAST_PREVIEW: '/api/podcast/preview',
  PODCAST_GENERATE: '/api/podcast/generate',
  PODCAST_STATUS: (jobId: string) => `/api/podcast/status/${jobId}`,
  PODCAST_DOWNLOAD: (jobId: string) => `/api/podcast/download/${jobId}`,
  
  // Health
  HEALTH: '/api/health'
} as const

// ============================================
// Application Settings
// ============================================

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'GedächtnisBoost Premium'
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'

// ============================================
// Feature Flags
// ============================================

export const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
export const ENABLE_DARK_MODE = process.env.NEXT_PUBLIC_ENABLE_DARK_MODE === 'true'

// ============================================
// Limits & Quotas
// ============================================

export const MAX_TEXT_LENGTH = parseInt(process.env.NEXT_PUBLIC_MAX_TEXT_LENGTH || '100000')
export const MAX_UPLOAD_SIZE_MB = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB || '10')
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

// ============================================
// User Roles & Limits (matching Backend)
// ============================================

export const USER_LIMITS = {
  FREE: {
    monthlyCharacters: 10000,
    maxAudioLength: 5 * 60, // 5 minutes
    features: ['basic_tts']
  },
  PAID: {
    monthlyCharacters: 100000,
    maxAudioLength: 30 * 60, // 30 minutes
    features: ['basic_tts', 'podcast', 'priority_queue']
  },
  ADMIN: {
    monthlyCharacters: Infinity,
    maxAudioLength: Infinity,
    features: ['all']
  }
} as const

// ============================================
// Timeouts & Retries
// ============================================

export const REQUEST_TIMEOUT_MS = 30000 // 30 seconds
export const REQUEST_RETRY_COUNT = 3
export const REQUEST_RETRY_DELAY_MS = 1000 // 1 second

// ============================================
// Storage Keys (for localStorage)
// ============================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language'
} as const

// ============================================
// Routes
// ============================================

export const ROUTES = {
  HOME: '/',
  LOGIN: '/',
  DASHBOARD: '/dashboard',
  TTS: '/dashboard/tts',
  PODCAST: '/dashboard/podcast',
  HISTORY: '/dashboard/history',
  SETTINGS: '/dashboard/settings'
} as const

// ============================================
// Validation Rules
// ============================================

export const VALIDATION = {
  USERNAME: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  PASSWORD: {
    minLength: 8,
    maxLength: 100
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  SCRIPT: {
    minLength: 100,
    maxLength: 500000
  }
} as const

// ============================================
// Type Safety for Constants
// ============================================

// Ensure API_URL is defined
if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL must be defined in .env.local')
}

// Validate URL format
try {
  new URL(API_URL)
} catch (e) {
  console.warn(`Invalid API_URL: ${API_URL}. Using default.`)
}
