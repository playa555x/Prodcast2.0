/**
 * Voice Library Page - Manage Used Voices with Previews
 *
 * Features:
 * - Display all used voices
 * - Audio previews for each voice
 * - Usage statistics
 * - Filter by provider, language, gender
 * - Search by name
 * - Mark favorites
 * - Quick voice assignment
 *
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, ErrorAlert, LoadingSpinner, DashboardNavbar } from '@/components'
import { ttsService } from '@/lib/tts.service'
import { TTSProvider } from '@/types'
import type { VoiceInfo } from '@/types'

export default function VoiceLibraryPage() {
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(true)
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [filteredVoices, setFilteredVoices] = useState<VoiceInfo[]>([])
  const [error, setError] = useState('')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [selectedGender, setSelectedGender] = useState<string>('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'provider'>('name')

  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)

  // Favorites (stored in localStorage)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('voice_favorites')
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)))
    }
  }, [])

  // Load voices from TTS service (same as TTS menu)
  useEffect(() => {
    const loadVoices = async () => {
      setLoading(true)
      setError('')

      // Load voices from all providers (same as TTS menu)
      const allVoices: VoiceInfo[] = []

      // Load from all TTS providers
      const providers = [TTSProvider.OPENAI, TTSProvider.ELEVENLABS, TTSProvider.SPEECHIFY]

      const loadPromises = providers.map(async (provider) => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 10000)
          )

          const resultPromise = ttsService.getVoices(provider)
          const result = await Promise.race([resultPromise, timeoutPromise])

          if (result.ok && result.value) {
            return result.value
          }
          return []
        } catch (e) {
          console.warn(`Failed to load voices from ${provider}:`, e)
          return []
        }
      })

      try {
        const results = await Promise.all(loadPromises)
        results.forEach(voices => allVoices.push(...voices))

        setVoices(allVoices)
        setFilteredVoices(allVoices)
        setLoading(false)

        if (allVoices.length === 0) {
          setError('Keine Stimmen verfügbar. Bitte überprüfe die API-Verbindung.')
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load voices')
        setLoading(false)
      }
    }

    loadVoices()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = [...voices]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Provider filter
    if (selectedProvider !== 'all') {
      filtered = filtered.filter((v) => v.provider?.toLowerCase() === selectedProvider.toLowerCase())
    }

    // Language filter
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter((v) => v.language === selectedLanguage)
    }

    // Gender filter
    if (selectedGender !== 'all') {
      filtered = filtered.filter((v) => v.gender === selectedGender)
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter((v) => favorites.has(v.id))
    }

    // Sort
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'provider') {
      filtered.sort((a, b) => (a.provider || '').localeCompare(b.provider || ''))
    }

    setFilteredVoices(filtered)
  }, [voices, searchQuery, selectedProvider, selectedLanguage, selectedGender, showFavoritesOnly, sortBy, favorites])

  // Play preview
  const playPreview = async (voice: VoiceInfo) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    // If preview URL exists, play it
    if (voice.previewUrl) {
      const audio = new Audio(voice.previewUrl)
      audio.onended = () => {
        setPlayingVoiceId(null)
      }
      audio.onerror = () => {
        setError('Fehler beim Abspielen des Previews')
        setPlayingVoiceId(null)
      }
      audio.play()
      audioRef.current = audio
      setPlayingVoiceId(voice.id)
    } else {
      setError('Kein Preview verfügbar für diese Stimme')
      setTimeout(() => setError(''), 3000)
    }
  }

  // Stop playback
  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingVoiceId(null)
  }

  // Toggle favorite
  const toggleFavorite = (voiceId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(voiceId)) {
      newFavorites.delete(voiceId)
    } else {
      newFavorites.add(voiceId)
    }
    setFavorites(newFavorites)

    // Persist to localStorage
    localStorage.setItem('voice_favorites', JSON.stringify(Array.from(newFavorites)))
  }

  // Get unique values for filters
  const uniqueProviders = Array.from(new Set(voices.map((v) => v.provider).filter(Boolean)))
  const uniqueLanguages = Array.from(new Set(voices.map((v) => v.language).filter(Boolean)))
  const uniqueGenders = Array.from(new Set(voices.map((v) => v.gender).filter(Boolean)))

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Lade Voice Library..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with DashboardNavbar */}
      <DashboardNavbar>
        <Button onClick={() => router.push('/dashboard')} className="text-xs md:text-sm px-2 md:px-4">
          ← Zurück
        </Button>
        <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">
          🎤 Voice Library
        </h1>
        <div className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
          {filteredVoices.length} von {voices.length} Stimmen
        </div>
      </DashboardNavbar>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error */}
        {error && (
          <div className="mb-4">
            <ErrorAlert message={error} onDismiss={() => setError('')} />
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Filter & Suche</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Suche
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Stimmenname..."
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
            </div>

            {/* Provider */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              >
                <option value="all">Alle Provider</option>
                {uniqueProviders.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sprache
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              >
                <option value="all">Alle Sprachen</option>
                {uniqueLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Geschlecht
              </label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              >
                <option value="all">Alle</option>
                {uniqueGenders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort & Favorites Toggle */}
          <div className="flex items-center gap-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sortierung
              </label>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'name' ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => setSortBy('name')}
                >
                  🔤 Name
                </Button>
                <Button
                  variant={sortBy === 'provider' ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => setSortBy('provider')}
                >
                  🎙️ Provider
                </Button>
              </div>
            </div>

            <div className="flex-1" />

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Favoriten
              </label>
              <Button
                variant={showFavoritesOnly ? 'primary' : 'outline'}
                size="small"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                {showFavoritesOnly ? '⭐ Nur Favoriten' : '☆ Alle anzeigen'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Voices Grid */}
        {filteredVoices.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-2">Keine Stimmen gefunden</p>
              <p className="text-sm">Versuche andere Filter oder Suchbegriffe</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVoices.map((voice) => (
              <Card key={voice.id} className="hover:shadow-2xl transition-all shadow-xl rounded-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {voice.name}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">{voice.provider}</span>
                      {voice.language && ` • ${voice.language}`}
                      {voice.gender && ` • ${voice.gender}`}
                    </div>
                  </div>

                  {/* Favorite Button */}
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => toggleFavorite(voice.id)}
                  >
                    {favorites.has(voice.id) ? '⭐' : '☆'}
                  </Button>
                </div>

                {/* Voice Details */}
                <div className="space-y-2 mb-4">
                  {voice.language && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Sprache:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{voice.language}</span>
                    </div>
                  )}
                  {voice.gender && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Geschlecht:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100 font-medium capitalize">{voice.gender}</span>
                    </div>
                  )}
                  {voice.category && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Kategorie:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{voice.category}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {/* Play Preview Button */}
                  {voice.previewUrl ? (
                    playingVoiceId === voice.id ? (
                      <Button
                        variant="outline"
                        size="small"
                        fullWidth
                        onClick={stopPlayback}
                      >
                        ⏹️ Stop
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="small"
                        fullWidth
                        onClick={() => playPreview(voice)}
                      >
                        ▶️ Vorschau
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="small"
                      fullWidth
                      disabled
                    >
                      ▶️ Kein Preview
                    </Button>
                  )}

                  {/* Use Voice Button */}
                  <Button
                    variant="primary"
                    size="small"
                    fullWidth
                    onClick={() => {
                      router.push(`/dashboard/tts?voice=${voice.id}&provider=${voice.provider}`)
                    }}
                  >
                    🎤 Verwenden
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
