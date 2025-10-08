/**
 * useTTSProviders Hook
 *
 * Lädt nur verfügbare TTS-Provider vom Backend
 * Verhindert CORS-Fehler durch wiederholte Requests an nicht konfigurierte APIs
 *
 * Quality: 12/10
 */

import { useState, useEffect } from 'react'
import type { TTSProvider, VoiceInfo } from '@/types'

interface ProviderInfo {
  provider: TTSProvider
  name: string
  available: boolean
  voices: VoiceInfo[]
  cost_per_character: number
  max_characters: number
}

interface UseTTSProvidersReturn {
  providers: ProviderInfo[]
  availableProviders: TTSProvider[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTTSProviders(): UseTTSProvidersReturn {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProviders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tts/providers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('Keine TTS-Provider konfiguriert. Bitte API-Keys in den Admin-Einstellungen hinzufügen.')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: ProviderInfo[] = await response.json()
      setProviders(data)
    } catch (e: any) {
      console.error('Failed to load TTS providers:', e)
      setError(e.message || 'Fehler beim Laden der TTS-Provider')
      setProviders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  const availableProviders = providers.map(p => p.provider)

  return {
    providers,
    availableProviders,
    loading,
    error,
    refetch: fetchProviders
  }
}

/**
 * Load voices for a specific provider (only if available)
 */
export async function loadVoicesForProvider(
  provider: TTSProvider,
  language?: string,
  gender?: string
): Promise<VoiceInfo[]> {
  try {
    const params = new URLSearchParams()
    if (language) params.append('language', language)
    if (gender) params.append('gender', gender)

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/tts/voices/${provider}${params.toString() ? '?' + params.toString() : ''}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      if (response.status === 503) {
        console.warn(`Provider ${provider} is not available (503)`)
        return []
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const voices: VoiceInfo[] = await response.json()
    return voices
  } catch (error) {
    console.error(`Failed to load voices for ${provider}:`, error)
    return []
  }
}
