/**
 * AI Research Page - Claude-Powered Podcast Research
 *
 * Features:
 * - Topic-based research
 * - Multi-source analysis (YouTube, Podcasts, Web, Scientific)
 * - 3 Variant generation (Young, Middle-aged, Scientific)
 * - Character system with dynamic guests
 * - Real-time progress tracking
 * - File download
 *
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ErrorAlert, SuccessAlert, DashboardNavbar } from '@/components'
import { researchService } from '@/lib/research.service'
import {
  ResearchStatus,
  type ResearchRequest,
  type ResearchJobResponse,
  type ResearchStatusResponse
} from '@/types'

const POLL_INTERVAL_MS = 3000

export default function ResearchPage() {
  const router = useRouter()

  // Form state
  const [projectName, setProjectName] = useState('')
  const [claudeMode, setClaudeMode] = useState<'direct' | 'storage' | 'queue'>('direct')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(45)
  const [numGuests, setNumGuests] = useState(1)
  const [includeListeners, setIncludeListeners] = useState(true)
  const [includeYouTube, setIncludeYouTube] = useState(true)
  const [includePodcasts, setIncludePodcasts] = useState(true)
  const [includeScientific, setIncludeScientific] = useState(true)
  const [includeEveryday, setIncludeEveryday] = useState(true)
  const [spontaneous, setSpontaneous] = useState(true)
  const [randomness, setRandomness] = useState(0.3)

  // Job state
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<ResearchStatusResponse | null>(null)
  const [result, setResult] = useState<ResearchJobResponse | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [successShown, setSuccessShown] = useState(false)

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleStart = async () => {
    // Validation
    const request: ResearchRequest = {
      topic,
      target_duration_minutes: duration,
      num_guests: numGuests,
      include_listener_topics: includeListeners,
      include_youtube: includeYouTube,
      include_podcasts: includePodcasts,
      include_scientific: includeScientific,
      include_everyday: includeEveryday,
      spontaneous_deviations: spontaneous,
      randomness_level: randomness
    }

    const validation = researchService.validateRequest(request)
    if (!validation.valid) {
      setError(validation.error!)
      return
    }

    setError('')
    setSuccess('')
    setSuccessShown(false)
    setLoading(true)
    setResult(null)

    const res = await researchService.startResearch(request)

    if (res.ok) {
      setSuccess('Research job started! This may take 2-5 minutes.')
      setSuccessShown(true)
      pollStatus(res.value.job_id)
    } else {
      setError(res.error.detail)
      setLoading(false)
    }
  }

  const pollStatus = async (jId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    pollIntervalRef.current = setInterval(async () => {
      const res = await researchService.getStatus(jId)

      if (res.ok) {
        setStatus(res.value)

        if (res.value.status === ResearchStatus.COMPLETED) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }

          // Fetch full result
          const resultRes = await researchService.getResult(jId)
          if (resultRes.ok) {
            setResult(resultRes.value)
            if (!successShown) {
              setSuccess('✅ Research completed! Check results below.')
              setSuccessShown(true)
            }
          }

          setLoading(false)
        } else if (res.value.status === ResearchStatus.FAILED) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setError(res.value.error_message || 'Research failed')
          setLoading(false)
        }
      }
    }, POLL_INTERVAL_MS)
  }

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
        <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
          🧠 AI Podcast Research
        </h1>
      </DashboardNavbar>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-600">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 animate-gradient-shift" />
            <div className="absolute inset-0 opacity-10 mix-blend-overlay"
                 style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'4\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'}} />
          </div>
          <div className="relative z-10 px-8 py-8">
            <h2 className="text-3xl font-bold text-white mb-2">Claude-Powered Research & Script Generation</h2>
            <p className="text-white/90">Multi-Source Analyse • 3 Varianten • Automatische Character-Generierung</p>
          </div>
        </div>

        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(99 102 241), 0 0 40px rgb(99 102 241 / 0.4)' }} />
          <div className="relative">
          {/* Project Name */}
          <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              📦 Projektname
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="z.B. 'KI in der Medizin - Episode 1'"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Wird automatisch mit dem aktuellen Projekt verknüpft
            </p>
          </div>

          {/* Claude API Mode Selection */}
          <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              🤖 Claude API Modus
            </label>
            <div className="space-y-3">
              {/* Direct API Mode */}
              <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-indigo-300 ${claudeMode === 'direct' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-600'}`}>
                <input
                  type="radio"
                  name="claudeMode"
                  value="direct"
                  checked={claudeMode === 'direct'}
                  onChange={(e) => setClaudeMode(e.target.value as any)}
                  className="mt-1 w-4 h-4 text-indigo-600"
                />
                <div className="ml-3 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">⚡ Direct API Response</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Sofortige Antwort von Claude API. Das komplette Skript wird direkt zurückgegeben.
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="text-green-600 font-medium">✓ Schnellste Methode</span>
                    <span className="text-orange-600 font-medium">⚠ Höchste Token-Kosten</span>
                    <span className="text-blue-600 font-medium">⏱ ~2-3 Minuten</span>
                  </div>
                </div>
              </label>

              {/* API + Storage Mode */}
              <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-indigo-300 ${claudeMode === 'storage' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-600'}`}>
                <input
                  type="radio"
                  name="claudeMode"
                  value="storage"
                  checked={claudeMode === 'storage'}
                  onChange={(e) => setClaudeMode(e.target.value as any)}
                  className="mt-1 w-4 h-4 text-indigo-600"
                />
                <div className="ml-3 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">💾 API + File Storage</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Claude generiert das Skript und speichert es in eine Datei (Desktop/Google Drive).
                    Link wird zurückgegeben, Datei kann manuell heruntergeladen werden.
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="text-green-600 font-medium">✓ Mittlere Token-Kosten</span>
                    <span className="text-blue-600 font-medium">⏱ ~2-4 Minuten</span>
                    <span className="text-purple-600 font-medium">📁 Datei verfügbar</span>
                  </div>
                </div>
              </label>

              {/* Drive Queue Mode */}
              <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-indigo-300 ${claudeMode === 'queue' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-600'}`}>
                <input
                  type="radio"
                  name="claudeMode"
                  value="queue"
                  checked={claudeMode === 'queue'}
                  onChange={(e) => setClaudeMode(e.target.value as any)}
                  className="mt-1 w-4 h-4 text-indigo-600"
                />
                <div className="ml-3 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">🔄 Drive Queue System</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Anfrage wird in Google Drive Queue geschrieben. File Watcher + Claude Desktop/Code + MCP
                    verarbeiten asynchron. Ergebnis wird in Drive abgelegt.
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="text-green-600 font-medium">✓ Niedrigste Kosten</span>
                    <span className="text-orange-600 font-medium">⚠ Längste Wartezeit</span>
                    <span className="text-blue-600 font-medium">⏱ ~5-10 Minuten</span>
                    <span className="text-purple-600 font-medium">🤖 Automatisiert</span>
                  </div>
                </div>
              </label>
            </div>

            {claudeMode !== 'direct' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Hinweis:</strong> Für die Modi "API + Storage" und "Drive Queue" muss ein
                  Speicherort in den Einstellungen konfiguriert werden.
                  <button
                    onClick={() => router.push('/dashboard/account?tab=settings')}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Zu den Einstellungen →
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Topic Input */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              💬 Podcast-Thema
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="z.B. 'Künstliche Intelligenz in der Medizin'"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {topic.length}/500 Zeichen
            </p>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Duration */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Ziel-Länge: {duration} Minuten
              </label>
              <input
                type="range"
                min="30"
                max="60"
                step="5"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>30 min</span>
                <span>45 min</span>
                <span>60 min</span>
              </div>
            </div>

            {/* Guests */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Anzahl Gäste: {numGuests}
              </label>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={numGuests}
                onChange={(e) => setNumGuests(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
              </div>
            </div>
          </div>

          {/* Research Sources */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">📚 Recherche-Quellen</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeYouTube}
                  onChange={(e) => setIncludeYouTube(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-900 dark:text-gray-300">YouTube</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePodcasts}
                  onChange={(e) => setIncludePodcasts(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-900 dark:text-gray-300">Best Podcasts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeScientific}
                  onChange={(e) => setIncludeScientific(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-900 dark:text-gray-300">Wissenschaftlich</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEveryday}
                  onChange={(e) => setIncludeEveryday(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-900 dark:text-gray-300">Alltag</span>
              </label>
            </div>
          </div>

          {/* Style Options */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">🎭 Podcast-Stil</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeListeners}
                  onChange={(e) => setIncludeListeners(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-900 dark:text-gray-300">Hörer-Fragen einbauen</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spontaneous}
                  onChange={(e) => setSpontaneous(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-900 dark:text-gray-300">Spontane Abschweifungen erlauben</span>
              </label>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Zufälligkeit: {(randomness * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={randomness}
                  onChange={(e) => setRandomness(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Strukturiert</span>
                  <span>Ausgewogen</span>
                  <span>Chaotisch</span>
                </div>
              </div>
            </div>
          </div>

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

          {/* Start Button */}
          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={handleStart}
            disabled={loading || !topic.trim()}
            loading={loading}
          >
            {loading ? 'Researching...' : '🚀 Start AI Research'}
          </Button>

          {/* Status */}
          {status && loading && (
            <div className="mt-6 p-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-2xl">
              <h3 className="text-xl font-bold mb-4">
                {researchService.getStatusLabel(status.status)}
              </h3>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>{status.current_step}</span>
                  <span>{status.progress_percent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-white h-3 rounded-full transition-all duration-300"
                    style={{ width: `${status.progress_percent}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-white/80">
                Dies kann 2-5 Minuten dauern. Claude AI analysiert Quellen und generiert 3 Varianten.
              </p>
            </div>
          )}

          {/* Results */}
          {result && result.status === ResearchStatus.COMPLETED && (
            <div className="mt-6 space-y-6">
              {/* Research Summary */}
              {result.research_result && (
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-green-900 flex items-center gap-2">
                      <span>📊</span> Research-Ergebnisse
                    </h3>
                    {result.file_paths['research'] && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/research/download/${result.job_id}/research`}
                        download
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition-all"
                      >
                        ⬇️ Download
                      </a>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-green-700 font-medium">Quellen</div>
                      <div className="text-2xl font-bold text-green-900">
                        {result.research_result.total_sources}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-green-700 font-medium">Key Findings</div>
                      <div className="text-2xl font-bold text-green-900">
                        {result.research_result.key_findings.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-green-700 font-medium">Quality Score</div>
                      <div className="text-2xl font-bold text-green-900">
                        {result.research_result.estimated_quality_score.toFixed(1)}/10
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-green-900">
                    <p className="font-semibold mb-2">Top Findings:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.research_result.key_findings.slice(0, 5).map((finding, i) => (
                        <li key={i}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl shadow-xl">
                <h3 className="text-lg font-bold text-purple-900 mb-3">
                  ⭐ Claude's Empfehlung
                </h3>
                <p className="text-purple-900 mb-2">
                  <strong>Beste Variante:</strong>{' '}
                  {researchService.getAudienceLabel(result.recommended_variant)}
                </p>
                <p className="text-sm text-purple-800">
                  {result.recommendation_reason}
                </p>
              </div>

              {/* Variants */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  📝 Generierte Script-Varianten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.variants.map((variant) => (
                    <div
                      key={variant.audience}
                      className={`p-6 rounded-2xl border-2 shadow-xl transition-all hover:shadow-2xl ${
                        variant.audience === result.recommended_variant
                          ? 'bg-indigo-50 border-indigo-500'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {variant.audience === result.recommended_variant && (
                        <div className="text-indigo-600 font-bold text-xs mb-2">
                          ⭐ EMPFOHLEN
                        </div>
                      )}
                      <h4 className="font-bold text-gray-900 mb-2">
                        {researchService.getAudienceLabel(variant.audience)}
                      </h4>
                      <div className="text-sm text-gray-700 space-y-1 mb-4">
                        <p>Tone: {variant.tone}</p>
                        <p>Wörter: {variant.word_count.toLocaleString()}</p>
                        <p>Segmente: {variant.segments.length}</p>
                        <p>Charaktere: {variant.characters.length}</p>
                      </div>
                      {result.file_paths[variant.audience] && (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/research/download/${result.job_id}/${variant.audience}`}
                          download
                          className="block text-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-all"
                        >
                          ⬇️ Download Script
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Processing Info */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <p>
                  Verarbeitet in {result.processing_time_seconds?.toFixed(1)}s
                </p>
                {result.output_directory && (
                  <p className="mt-1 text-xs">
                    Gespeichert in: <code>{result.output_directory}</code>
                  </p>
                )}
              </div>

              {/* Next Step: Voice Assignment */}
              <div className="mt-8 p-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl text-white text-center shadow-2xl">
                <h3 className="text-xl font-bold mb-3">
                  🎤 Nächster Schritt: Voice Assignment
                </h3>
                <p className="mb-4 text-white/90">
                  Weise jetzt jedem Charakter eine Stimme zu und starte die Podcast-Produktion!
                </p>
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => router.push(`/dashboard/voice-assignment?job=${result.job_id}&variant=${result.recommended_variant}`)}
                  className="bg-white text-indigo-600 hover:bg-gray-100"
                >
                  ➡️ Zur Voice Assignment
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
