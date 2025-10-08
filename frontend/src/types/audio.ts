/**
 * Audio/TTS Types - Synced with Backend Models
 * Backend: models/audio.py
 * 
 * CRITICAL: These types MUST match Backend DTOs exactly!
 * Last synced: 2025-10-06
 */

// ============================================
// Enums (matching Backend)
// ============================================

export enum TTSProvider {
  OPENAI = 'openai',
  SPEECHIFY = 'speechify',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  ELEVENLABS = 'elevenlabs'
}

export enum AudioFormat {
  MP3 = 'mp3',
  WAV = 'wav',
  OGG = 'ogg',
  AAC = 'aac'
}

export enum AudioStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// ============================================
// Audio Types (matching Backend DTOs)
// ============================================

export interface AudioGenerateRequest {
  text: string
  provider: TTSProvider
  voice: string
  speed?: number // 0.25 to 4.0, default 1.0
  format?: AudioFormat // default MP3
}

export interface AudioGenerateResponse {
  audioId: string
  status: AudioStatus
  audioUrl: string | null
  durationSeconds: number | null
  fileSizeBytes: number | null
  characterCount: number
  costUsd: number
  provider: TTSProvider
  voice: string
}

export interface VoiceInfo {
  id: string
  name: string
  language: string
  gender: string | null
  previewUrl: string | null
  description: string | null
  isPremium?: boolean
  pricePerToken?: number
}

export interface ProviderInfo {
  provider: TTSProvider
  name: string
  available: boolean
  voices: VoiceInfo[]
  costPerCharacter: number
  maxCharacters: number
}

// ============================================
// Voice Mappings (Helper)
// ============================================

export const VOICE_MAPPINGS: Record<TTSProvider, string[]> = {
  // OpenAI TTS - 11 voices (Updated 2025)
  [TTSProvider.OPENAI]: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse'],

  // Speechify - System voices (verified 2025)
  [TTSProvider.SPEECHIFY]: ['henry', 'mia', 'george', 'jessica', 'snoop'],

  // ElevenLabs - Fallback voices (100+ loaded dynamically via API)
  // These are only used if API call fails
  [TTSProvider.ELEVENLABS]: [
    '21m00Tcm4TlvDq8ikWAM',  // Rachel - Fallback only
    'AZnzlk1XvdvUeBnXmlld',  // Domi - Fallback only
    'EXAVITQu4vr4xnSDxMaL',  // Bella - Fallback only
    'ErXwobaYiN019PkySvjV',  // Antoni - Fallback only
    'MF3mGyEYCl7XYWbV9V6O',  // Elli - Fallback only
    'TxGEqnHWrfWFTfGW9XjX',  // Josh - Fallback only
    'VR6AewLTigWG4xSOukaG',  // Arnold - Fallback only
    'pNInz6obpgDQGcFmaJgB',  // Adam - Fallback only
    'yoZ06aMxZJJ28mfd3POQ'   // Sam - Fallback only
  ],

  // Google TTS (gTTS - FREE!)
  [TTSProvider.GOOGLE]: [
    'de',    // German
    'en',    // English
    'es',    // Spanish
    'fr',    // French
    'it',    // Italian
    'pt',    // Portuguese
    'nl',    // Dutch
    'pl'     // Polish
  ],

  // Microsoft Edge TTS (edge-tts - FREE, 559 voices!)
  [TTSProvider.MICROSOFT]: [
    'de-DE-KatjaNeural',   // German Female
    'de-DE-ConradNeural',  // German Male
    'en-US-AriaNeural',    // English US Female
    'en-US-GuyNeural',     // English US Male
    'en-GB-SoniaNeural',   // English UK Female
    'en-GB-RyanNeural',    // English UK Male
    'es-ES-ElviraNeural',  // Spanish Female
    'fr-FR-DeniseNeural'   // French Female
  ]
}

// ============================================
// Type Guards
// ============================================

export const isAudioGenerateResponse = (obj: any): obj is AudioGenerateResponse => {
  return (
    typeof obj === 'object' &&
    typeof obj.audioId === 'string' &&
    Object.values(AudioStatus).includes(obj.status) &&
    typeof obj.characterCount === 'number'
  )
}

export const isProviderInfo = (obj: any): obj is ProviderInfo => {
  return (
    typeof obj === 'object' &&
    Object.values(TTSProvider).includes(obj.provider) &&
    typeof obj.available === 'boolean' &&
    Array.isArray(obj.voices)
  )
}
