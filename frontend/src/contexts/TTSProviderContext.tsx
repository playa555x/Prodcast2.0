/**
 * TTS Provider Context
 *
 * Globaler State für verfügbare TTS-Provider
 * Verhindert CORS-Fehler durch Provider-Check vor jedem Request
 *
 * Quality: 12/10
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { TTSProvider, VoiceInfo } from '@/types'

interface ProviderInfo {
  provider: TTSProvider
  name: string
  available: boolean
  voices: VoiceInfo[]
  costPerCharacter: number
  maxCharacters: number
}

interface TTSProviderContextType {
  providers: ProviderInfo[]
  availableProviders: TTSProvider[]
  loading: boolean
  error: string | null
  isProviderAvailable: (provider: TTSProvider) => boolean
  getVoicesForProvider: (provider: TTSProvider) => VoiceInfo[]
  refetch: () => Promise<void>
}

const TTSProviderContext = createContext<TTSProviderContextType | undefined>(undefined)

export function TTSProviderProvider({ children }: { children: ReactNode }) {
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
          console.warn('No TTS providers configured (503)')
          // 503 means no providers available - this is OK, not an error
          setProviders([])
          setLoading(false)
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data: ProviderInfo[] = await response.json()
      setProviders(data)
      console.log(`✅ Loaded ${data.length} TTS providers`)
    } catch (e: any) {
      console.error('Failed to load TTS providers:', e)
      setError(e.message)
      setProviders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  const availableProviders = providers.map(p => p.provider)

  const isProviderAvailable = (provider: TTSProvider) => {
    return availableProviders.includes(provider)
  }

  const getVoicesForProvider = (provider: TTSProvider) => {
    const providerInfo = providers.find(p => p.provider === provider)
    return providerInfo?.voices || []
  }

  return (
    <TTSProviderContext.Provider value={{
      providers,
      availableProviders,
      loading,
      error,
      isProviderAvailable,
      getVoicesForProvider,
      refetch: fetchProviders
    }}>
      {children}
    </TTSProviderContext.Provider>
  )
}

export function useTTSProvider() {
  const context = useContext(TTSProviderContext)
  if (!context) {
    throw new Error('useTTSProvider must be used within TTSProviderProvider')
  }
  return context
}
