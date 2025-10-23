/**
 * Voice Assignment Page - Assign Voices to Characters
 *
 * Features:
 * - Load research results
 * - Display all characters
 * - Voice picker with filters
 * - Start production
 * - Progress tracking
 *
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, ErrorAlert, SuccessAlert, LoadingSpinner, DashboardNavbar } from '@/components'
import { researchService } from '@/lib/research.service'
import { productionService } from '@/lib/production.service'
import { ttsService } from '@/lib/tts.service'
import {
  TTSProvider,
  ProductionStatus,
  type VoiceAssignment,
  type VoiceInfo
} from '@/types'

const POLL_INTERVAL_MS = 3000

function VoiceAssignmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job')
  const variant = searchParams.get('variant')

  // State
  const [loading, setLoading] = useState(true)
  const [characters, setCharacters] = useState<any[]>([])
  const [assignments, setAssignments] = useState<Record<string, VoiceAssignment>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Voice selection state
  const [selectedProviders, setSelectedProviders] = useState<Record<string, string>>({})
  const [availableVoices, setAvailableVoices] = useState<Record<string, VoiceInfo[]>>({})
  const [loadingVoices, setLoadingVoices] = useState<Record<string, boolean>>({})

  // Production state
  const [productionStatus, setProductionStatus] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const providers = [
    { id: TTSProvider.OPENAI, name: 'OpenAI' },
    { id: TTSProvider.SPEECHIFY, name: 'Speechify' },
    { id: TTSProvider.ELEVENLABS, name: 'ElevenLabs' },
    { id: TTSProvider.GOOGLE, name: 'Google Cloud' }
  ]

  // Load research results
  const loadResearch = useCallback(async () => {
    if (!jobId) {
      setError('No research job ID provided')
      setLoading(false)
      return
    }

    try {
      const result = await researchService.getResult(jobId)

      if (!result.ok) {
        setError(result.error.detail)
        setLoading(false)
        return
      }

      // Get selected variant
      const selectedVariant = result.value.variants.find(
        (v) => v.audience === variant
      )

      if (!selectedVariant) {
        setError(`Variant '${variant}' not found`)
        setLoading(false)
        return
      }

      // Extract characters
      const chars = selectedVariant.characters || []
      setCharacters(chars)

      // Initialize providers (default: OpenAI)
      const initProviders: Record<string, string> = {}
      chars.forEach((c) => {
        initProviders[c.id] = TTSProvider.OPENAI
      })
      setSelectedProviders(initProviders)

      setLoading(false)
    } catch (e: any) {
      setError(e.message || 'Failed to load research results')
      setLoading(false)
    }
  }, [jobId, variant])

  useEffect(() => {
    loadResearch()
  }, [loadResearch])

  // Load voices when provider changes
  const loadVoicesForCharacter = async (characterId: string, provider: string) => {
    setLoadingVoices({ ...loadingVoices, [characterId]: true })

    const result = await ttsService.getVoices(provider as TTSProvider)

    if (result.ok && result.value) {
      setAvailableVoices({
        ...availableVoices,
        [characterId]: result.value
      })

      // Auto-select first voice
      if (result.value.length > 0 && result.value[0]) {
        setAssignments({
          ...assignments,
          [characterId]: {
            character_id: characterId,
            character_name: characters.find((c) => c.id === characterId)?.name || '',
            provider: provider,
            voice_id: result.value[0].id,
            voice_name: result.value[0].name
          }
        })
      }
    }

    setLoadingVoices({ ...loadingVoices, [characterId]: false })
  }

  // Load initial voices
  useEffect(() => {
    characters.forEach((char) => {
      loadVoicesForCharacter(char.id, TTSProvider.OPENAI)
    })
  }, [characters])

  const handleProviderChange = (characterId: string, provider: string) => {
    setSelectedProviders({
      ...selectedProviders,
      [characterId]: provider
    })

    loadVoicesForCharacter(characterId, provider)
  }

  const handleVoiceChange = (characterId: string, voiceId: string) => {
    const char = characters.find((c) => c.id === characterId)
    const voices = availableVoices[characterId] || []
    const voice = voices.find((v) => v.id === voiceId)

    if (!char || !voice) return

    setAssignments({
      ...assignments,
      [characterId]: {
        character_id: characterId,
        character_name: char.name,
        provider: selectedProviders[characterId] || TTSProvider.OPENAI,
        voice_id: voice.id,
        voice_name: voice.name
      }
    })
  }

  const handleStartProduction = async () => {
    // Validate all characters have assignments
    const missing = characters.filter((c) => !assignments[c.id])
    if (missing.length > 0) {
      setError(`Please assign voices to all characters: ${missing.map((c) => c.name).join(', ')}`)
      return
    }

    setError('')
    setSuccess('')
    setGenerating(true)

    try {
      // Step 1: Start production
      const startResult = await productionService.startProduction({
        research_job_id: jobId!,
        selected_variant: variant!
      })

      if (!startResult.ok) {
        setError(startResult.error.detail)
        setGenerating(false)
        return
      }

      const prodJobId = startResult.value.production_job_id

      // Step 2: Generate segments
      const voiceAssignmentsList = Object.values(assignments)
      const generateResult = await productionService.generateSegments(
        prodJobId,
        voiceAssignmentsList
      )

      if (!generateResult.ok) {
        setError(generateResult.error.detail)
        setGenerating(false)
        return
      }

      setSuccess('Segment generation started! This may take several minutes.')

      // Step 3: Poll status
      pollProductionStatus(prodJobId)
    } catch (e: any) {
      setError(e.message || 'Failed to start production')
      setGenerating(false)
    }
  }

  const pollProductionStatus = async (prodJobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    pollIntervalRef.current = setInterval(async () => {
      const result = await productionService.getStatus(prodJobId)

      if (result.ok) {
        setProductionStatus(result.value)

        if (result.value.status === ProductionStatus.READY_FOR_EDITING) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }

          setGenerating(false)
          setSuccess('✅ Segments generated! Redirecting to studio...')

          // Redirect after 2 seconds
          setTimeout(() => {
            router.push(`/dashboard/studio?job=${prodJobId}`)
          }, 2000)
        } else if (result.value.status === ProductionStatus.FAILED) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setError(result.value.error_message || 'Production failed')
          setGenerating(false)
        }
      }
    }, POLL_INTERVAL_MS)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading characters..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with DashboardNavbar */}
      <DashboardNavbar>
        <Button onClick={() => router.push('/dashboard')} className="text-xs md:text-sm px-2 md:px-4">
          ← Zurück
        </Button>
        <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">🎤 Voice Assignment</h1>
      </DashboardNavbar>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Assign Voices to Characters
          </h2>
          <p className="text-gray-600 mb-6">
            Choose a voice provider and voice for each character in your podcast.
          </p>

          {/* Error/Success */}
          {error && (
            <div className="mb-4">
              <ErrorAlert message={error} onDismiss={() => setError('')} />
            </div>
          )}

          {success && !error && (
            <div className="mb-4">
              <SuccessAlert message={success} onDismiss={() => setSuccess('')} />
            </div>
          )}

          {/* Characters */}
          <div className="space-y-6 mb-8">
            {characters.map((char) => (
              <div
                key={char.id}
                className="p-6 border-2 border-gray-200 rounded-xl bg-white hover:border-indigo-300 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-2xl">
                    {char.role === 'host' ? '🎙️' : char.role === 'guest' ? '👤' : '💬'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{char.name}</h3>
                    <p className="text-sm text-gray-600">
                      <strong>Role:</strong> {char.role} | <strong>Style:</strong> {char.speech_style}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{char.personality}</p>
                  </div>
                </div>

                {/* Provider Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Provider
                    </label>
                    <select
                      value={selectedProviders[char.id] || TTSProvider.OPENAI}
                      onChange={(e) => handleProviderChange(char.id, e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Voice {loadingVoices[char.id] && <span className="text-blue-600 text-xs">(Loading...)</span>}
                    </label>
                    <select
                      value={assignments[char.id]?.voice_id || ''}
                      onChange={(e) => handleVoiceChange(char.id, e.target.value)}
                      disabled={loadingVoices[char.id]}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {loadingVoices[char.id] ? (
                        <option>Loading voices...</option>
                      ) : (
                        (availableVoices[char.id] || []).map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} {v.language && `[${v.language}]`} {v.gender && `(${v.gender})`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Assignment Status */}
                {assignments[char.id] && (
                  <div className="mt-3 text-sm text-green-600 flex items-center gap-2">
                    <span>✅</span>
                    <span>
                      Assigned: <strong>{assignments[char.id]?.voice_name}</strong> from{' '}
                      <strong>{assignments[char.id]?.provider}</strong>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Start Production Button */}
          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={handleStartProduction}
            disabled={generating || characters.length === 0}
            loading={generating}
          >
            {generating ? 'Generating Segments...' : '🚀 Start Production'}
          </Button>

          {/* Production Status */}
          {productionStatus && generating && (
            <div className="mt-6 p-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white">
              <h3 className="text-xl font-bold mb-4">
                {productionService.getStatusLabel(productionStatus.status)}
              </h3>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>{productionStatus.current_step}</span>
                  <span>
                    {productionStatus.segments_generated} / {productionStatus.total_segments} segments
                  </span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-white h-3 rounded-full transition-all duration-300"
                    style={{ width: `${productionStatus.progress_percent}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-white/80">
                This may take several minutes depending on the number of segments.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function VoiceAssignmentPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="large" message="Loading..." />}>
      <VoiceAssignmentContent />
    </Suspense>
  )
}
