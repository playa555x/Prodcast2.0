/**
 * Podcast Generator Page - Multi-Segment Podcast Creation
 * 
 * Features:
 * - Script preview
 * - Segment analysis
 * - Progress tracking
 * - Download on completion
 * 
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Textarea, ErrorAlert, DashboardNavbar } from '@/components'
import { podcastService } from '@/lib/podcast.service'
import { ttsService } from '@/lib/tts.service'
import { VOICE_MAPPINGS, TTSProvider, PodcastStatus, VoiceInfo } from '@/types'
import type { PodcastPreviewResponse, PodcastStatusResponse } from '@/types'
import { VALIDATION, PODCAST_POLL_INTERVAL_MS } from '@/lib/constants'

export default function PodcastPage() {
  const router = useRouter()
  const [script, setScript] = useState('')
  const [provider, setProvider] = useState<TTSProvider>(TTSProvider.OPENAI)
  const [voice, setVoice] = useState('alloy')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PodcastPreviewResponse | null>(null)
  const [jobStatus, setJobStatus] = useState<PodcastStatusResponse | null>(null)
  const [error, setError] = useState('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Dynamic voice loading
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)

  // Voice filters (only for ElevenLabs)
  const [languageFilter, setLanguageFilter] = useState<string>('')
  const [genderFilter, setGenderFilter] = useState<string>('')

  const providers = [
    { id: TTSProvider.OPENAI, name: 'OpenAI' },
    { id: TTSProvider.SPEECHIFY, name: 'Speechify' },
    { id: TTSProvider.ELEVENLABS, name: 'ElevenLabs' }
  ]

  // Load voices when provider or filters change
  const loadVoices = useCallback(async () => {
    setLoadingVoices(true)

    // Build filters (only for ElevenLabs)
    const filters = provider === TTSProvider.ELEVENLABS ? {
      language: languageFilter || undefined,
      gender: genderFilter || undefined
    } : undefined

    const result = await ttsService.getVoices(provider, filters)

    if (result.ok && result.value) {
      setAvailableVoices(result.value)
      if (result.value.length > 0 && result.value[0]) {
        setVoice(result.value[0].id)
      }
    } else {
      setAvailableVoices([])
      const fallbackVoice = VOICE_MAPPINGS[provider]?.[0]
      if (fallbackVoice) setVoice(fallbackVoice)
    }

    setLoadingVoices(false)
  }, [provider, languageFilter, genderFilter])

  useEffect(() => {
    loadVoices()
  }, [loadVoices])

  const handleProviderChange = (newProvider: string) => {
    const providerEnum = newProvider as TTSProvider
    setProvider(providerEnum)
    // Voices will be loaded by useEffect
  }

  const handlePreview = async () => {
    // Validation
    const validation = podcastService.validateScript(script)
    if (!validation.valid) {
      setError(validation.error!)
      return
    }

    setError('')
    setLoading(true)

    const result = await podcastService.preview({ scriptText: script })

    setLoading(false)

    if (result.ok) {
      setPreview(result.value)
    } else {
      setError(result.error.detail)
    }
  }

  const handleGenerate = async () => {
    if (!preview) {
      setError('Generate preview first')
      return
    }

    setError('')
    setLoading(true)

    const result = await podcastService.generate({
      scriptText: script,
      provider,
      voice,
      speed: 1.0
    })

    if (result.ok) {
      // Start polling for status with initial response transformed to PodcastStatusResponse
      const initialStatus: PodcastStatusResponse = {
        jobId: result.value.jobId,
        status: result.value.status,
        progressPercent: 0,
        currentSegment: null,
        totalSegments: result.value.totalSegments,
        completedSegments: 0,
        downloadUrl: null,
        errorMessage: null
      }
      setJobStatus(initialStatus)
      pollJobStatus(result.value.jobId)
    } else {
      setError(result.error.detail)
      setLoading(false)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    pollIntervalRef.current = setInterval(async () => {
      const result = await podcastService.getStatus(jobId)

      if (result.ok) {
        setJobStatus(result.value)

        // Stop polling if completed or failed
        if (
          result.value.status === PodcastStatus.COMPLETED ||
          result.value.status === PodcastStatus.FAILED
        ) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setLoading(false)
        }
      }
    }, PODCAST_POLL_INTERVAL_MS)
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with DashboardNavbar */}
      <DashboardNavbar>
        <Button onClick={() => router.push('/dashboard')} className="text-xs md:text-sm px-2 md:px-4">
          ← Zurück
        </Button>
        <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">🎙️ AI Podcast Research</h1>
      </DashboardNavbar>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(99 102 241), 0 0 40px rgb(99 102 241 / 0.4)' }} />
          <div className="relative z-10">
          {/* Script Input */}
          <div className="mb-6">
            <Textarea
              label={`Podcast Script (Min. ${VALIDATION.SCRIPT.minLength} characters)`}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter your podcast script here..."
              rows={12}
              showCounter
              counterMax={VALIDATION.SCRIPT.maxLength}
              helpText="Your script will be split into segments for generation"
            />
          </div>

          {/* Settings */}
          <div className="space-y-4 mb-6">
            {/* Provider Selection */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                TTS Provider
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* ElevenLabs Filters - Only show for ElevenLabs */}
            {provider === TTSProvider.ELEVENLABS && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">🔍 Voice Filters (ElevenLabs)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Language
                    </label>
                    <select
                      value={languageFilter}
                      onChange={(e) => setLanguageFilter(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Languages</option>
                      <option value="en">English</option>
                      <option value="de">German</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="pl">Polish</option>
                      <option value="nl">Dutch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Gender
                    </label>
                    <select
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Genders</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Selection */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Voice {loadingVoices && <span className="text-blue-600 text-xs">(Loading...)</span>}
              </label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                disabled={loadingVoices}
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loadingVoices ? (
                  <option>Loading voices...</option>
                ) : availableVoices.length > 0 ? (
                  availableVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.language && `[${v.language}]`} {v.gender && `(${v.gender})`}
                    </option>
                  ))
                ) : (
                  VOICE_MAPPINGS[provider].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))
                )}
              </select>
              {availableVoices.length > 0 && provider === TTSProvider.ELEVENLABS && (
                <p className="text-xs text-gray-500 mt-1">
                  ✅ {availableVoices.length} voices from ElevenLabs API
                </p>
              )}
            </div>
          </div>

          {/* Error Messages */}
          {error && (
            <div className="mb-4">
              <ErrorAlert message={error} onDismiss={() => setError('')} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <Button
              variant="success"
              size="large"
              className="flex-1"
              onClick={handlePreview}
              disabled={loading || script.length < VALIDATION.SCRIPT.minLength}
              loading={loading && !preview}
            >
              👁️ Generate Preview
            </Button>

            <Button
              variant="primary"
              size="large"
              className="flex-1"
              onClick={handleGenerate}
              disabled={loading || !preview}
              loading={loading && !!preview}
            >
              ✨ Generate Podcast
            </Button>
          </div>

          {/* Preview Results */}
          {preview && (
            <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span>📊</span> Preview Results
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Segments</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{preview.totalSegments}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Duration</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {preview.estimatedDurationMinutes.toFixed(1)} min
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Characters</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {preview.totalCharacters.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Est. Cost</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${preview.estimatedCostUsd.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Job Status */}
          {jobStatus && (
            <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                {jobStatus.status === PodcastStatus.COMPLETED ? '✅' : '⏳'}
                Podcast Generation {jobStatus.status === PodcastStatus.COMPLETED ? 'Completed' : 'In Progress'}
              </h3>

              {/* Progress Bar */}
              {jobStatus.status !== PodcastStatus.COMPLETED && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress: {jobStatus.progressPercent.toFixed(0)}%</span>
                    <span>{jobStatus.completedSegments} / {jobStatus.totalSegments} segments</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className="bg-white h-3 rounded-full transition-all duration-300"
                      style={{ width: `${jobStatus.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Job Info */}
              <div className="space-y-2 text-sm bg-white/10 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-white/80">Job ID:</span>
                  <code className="bg-white/20 px-2 py-1 rounded font-mono">{jobStatus.jobId}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Status:</span>
                  <span className="font-semibold">{jobStatus.status.toUpperCase()}</span>
                </div>
              </div>

              {/* Download Button */}
              {jobStatus.status === PodcastStatus.COMPLETED && jobStatus.downloadUrl && (
                <div className="mt-4">
                  <a
                    href={jobStatus.downloadUrl}
                    download
                    className="block w-full text-center px-6 py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border-2 border-indigo-200 dark:border-indigo-800"
                  >
                    ⬇️ Download Podcast
                  </a>
                </div>
              )}

              {/* Error */}
              {jobStatus.status === PodcastStatus.FAILED && jobStatus.errorMessage && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                  <p className="font-semibold mb-1">Error:</p>
                  <p className="text-sm">{jobStatus.errorMessage}</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
