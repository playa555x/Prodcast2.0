/**
 * Voice Selector Component
 *
 * Enhanced voice selection with:
 * - Name, language, gender display
 * - Premium badge
 * - Price per token
 * - Voice preview/playback
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

'use client'

import { useState, useRef } from 'react'
import { VoiceInfo, TTSProvider } from '@/types'
import { Button } from '@/components'

// ============================================
// Types
// ============================================

interface VoiceSelectorProps {
  voices: VoiceInfo[]
  selectedVoiceId: string
  onChange: (voiceId: string) => void
  provider: TTSProvider
  disabled?: boolean
}

// ============================================
// Pricing Constants (Hardcoded per API)
// ============================================

const VOICE_PRICING: Record<TTSProvider, { standard: number; premium: number }> = {
  [TTSProvider.OPENAI]: {
    standard: 0.000015, // $15 per 1M characters
    premium: 0.000030   // $30 per 1M characters
  },
  [TTSProvider.ELEVENLABS]: {
    standard: 0.000180, // $180 per 1M characters (Multilingual v1)
    premium: 0.000300   // $300 per 1M characters (Turbo v2)
  },
  [TTSProvider.GOOGLE]: {
    standard: 0.0, // FREE!
    premium: 0.0   // FREE!
  },
  [TTSProvider.MICROSOFT]: {
    standard: 0.0, // FREE!
    premium: 0.0   // FREE!
  },
  [TTSProvider.SPEECHIFY]: {
    standard: 0.000020, // Estimated pricing
    premium: 0.000040   // Estimated premium pricing
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get price for a voice
 */
const getVoicePrice = (voice: VoiceInfo, provider: TTSProvider): number => {
  if (voice.pricePerToken !== undefined) {
    return voice.pricePerToken
  }

  const pricing = VOICE_PRICING[provider]
  return voice.isPremium ? pricing.premium : pricing.standard
}

/**
 * Format price for display
 */
const formatPrice = (pricePerChar: number): string => {
  const pricePerMillion = pricePerChar * 1_000_000
  return `$${pricePerMillion.toFixed(2)}/1M chars`
}

/**
 * Get gender icon
 */
const getGenderIcon = (gender: string | null): string => {
  if (!gender) return '👤'
  const g = gender.toLowerCase()
  if (g.includes('male') && !g.includes('female')) return '👨'
  if (g.includes('female')) return '👩'
  return '👤'
}

/**
 * Get language flag (simple mapping)
 */
const getLanguageFlag = (language: string): string => {
  const lang = language.toLowerCase()
  if (lang.includes('en')) return '🇺🇸'
  if (lang.includes('de')) return '🇩🇪'
  if (lang.includes('es')) return '🇪🇸'
  if (lang.includes('fr')) return '🇫🇷'
  if (lang.includes('it')) return '🇮🇹'
  if (lang.includes('pt')) return '🇵🇹'
  if (lang.includes('ja')) return '🇯🇵'
  if (lang.includes('zh')) return '🇨🇳'
  if (lang.includes('ko')) return '🇰🇷'
  if (lang.includes('ar')) return '🇸🇦'
  if (lang.includes('hi')) return '🇮🇳'
  if (lang.includes('ru')) return '🇷🇺'
  return '🌐'
}

// ============================================
// Component
// ============================================

export function VoiceSelector({
  voices,
  selectedVoiceId,
  onChange,
  provider,
  disabled = false
}: VoiceSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const selectedVoice = voices.find(v => v.id === selectedVoiceId)

  /**
   * Play voice preview
   */
  const playPreview = async (voice: VoiceInfo, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!voice.previewUrl) {
      return
    }

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null)
      return
    }

    try {
      const audio = new Audio(voice.previewUrl)
      audioRef.current = audio

      audio.onended = () => {
        setPlayingVoiceId(null)
        audioRef.current = null
      }

      audio.onerror = () => {
        setPlayingVoiceId(null)
        audioRef.current = null
      }

      setPlayingVoiceId(voice.id)
      await audio.play()
    } catch (error) {
      console.error('Failed to play preview:', error)
      setPlayingVoiceId(null)
      audioRef.current = null
    }
  }

  /**
   * Select voice
   */
  const selectVoice = (voiceId: string) => {
    onChange(voiceId)
    setDropdownOpen(false)
  }

  return (
    <div className="relative">
      {/* Selected Voice Display */}
      <button
        onClick={() => !disabled && setDropdownOpen(!dropdownOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-left hover:border-indigo-500 dark:hover:border-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {selectedVoice ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg">{getGenderIcon(selectedVoice.gender)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedVoice.name}</span>
                  {selectedVoice.isPremium && (
                    <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                      ⭐ PREMIUM
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span>{getLanguageFlag(selectedVoice.language)} {selectedVoice.language}</span>
                  {selectedVoice.gender && (
                    <>
                      <span>•</span>
                      <span>{selectedVoice.gender}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    {formatPrice(getVoicePrice(selectedVoice, provider))}
                  </span>
                </div>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">Select a voice...</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg shadow-2xl z-50 max-h-[400px] overflow-y-auto">
            {voices.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <p className="text-sm">No voices available</p>
              </div>
            ) : (
              <div className="py-2">
                {voices.map((voice) => {
                  const price = getVoicePrice(voice, provider)
                  const isSelected = voice.id === selectedVoiceId
                  const isPlaying = playingVoiceId === voice.id

                  return (
                    <button
                      key={voice.id}
                      onClick={() => selectVoice(voice.id)}
                      className={`w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                        isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{getGenderIcon(voice.gender)}</span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{voice.name}</h4>
                            {voice.isPremium && (
                              <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                                ⭐ PREMIUM
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                                ✓ Selected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>{getLanguageFlag(voice.language)} {voice.language}</span>
                            {voice.gender && (
                              <>
                                <span>•</span>
                                <span>{voice.gender}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className="font-medium text-indigo-600 dark:text-indigo-400">
                              {formatPrice(price)}
                            </span>
                          </div>

                          {voice.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-2">
                              {voice.description}
                            </p>
                          )}

                          {/* Preview Button */}
                          {voice.previewUrl && (
                            <button
                              onClick={(e) => playPreview(voice, e)}
                              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                                isPlaying
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                              }`}
                            >
                              {isPlaying ? '⏸️ Stop Preview' : '▶️ Play Preview'}
                            </button>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
