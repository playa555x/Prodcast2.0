/**
 * Timeline Editor Page - Professional Audio Editing Interface
 *
 * Features:
 * - Segment-based timeline display
 * - Individual segment editing (text, speed, voice, volume)
 * - Audio preview for each segment
 * - Regenerate individual segments
 * - Export final podcast
 * - Multi-track visualization (Speech, Music, SFX)
 *
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, ErrorAlert, SuccessAlert, LoadingSpinner, DashboardNavbar } from '@/components'
import { productionService } from '@/lib/production.service'
import { ttsService } from '@/lib/tts.service'
import {
  TTSProvider,
  type Timeline,
  type AudioSegment,
  type VoiceInfo
} from '@/types'

function TimelineEditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job')

  // Timeline state
  const [loading, setLoading] = useState(true)
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [selectedTrack, setSelectedTrack] = useState(0) // Default: Speech track

  // Segment editing state
  const [editingSegment, setEditingSegment] = useState<AudioSegment | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [editedSpeed, setEditedSpeed] = useState(1.0)
  const [editedVolume, setEditedVolume] = useState(1.0)
  const [regenerating, setRegenerating] = useState(false)

  // Voice change state
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('')

  // Export state
  const [exporting, setExporting] = useState(false)

  // Alert state
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null)

  // Load timeline
  useEffect(() => {
    const loadTimeline = async () => {
      if (!jobId) {
        setError('No production job ID provided')
        setLoading(false)
        return
      }

      try {
        const result = await productionService.getTimeline(jobId)

        if (!result.ok) {
          setError(result.error.detail)
          setLoading(false)
          return
        }

        setTimeline(result.value)
        setLoading(false)
      } catch (e: any) {
        setError(e.message || 'Failed to load timeline')
        setLoading(false)
      }
    }

    loadTimeline()
  }, [jobId])

  // Open edit modal
  const openEditModal = async (segment: AudioSegment) => {
    setEditingSegment(segment)
    setEditedText(segment.text || '')
    setEditedSpeed(segment.speed)
    setEditedVolume(segment.volume)
    setSelectedVoiceId(segment.voice_id || '')
    setEditModalOpen(true)

    // Load available voices for the provider
    if (segment.provider) {
      const result = await ttsService.getVoices(segment.provider as TTSProvider)
      if (result.ok && result.value) {
        setAvailableVoices(result.value)
      }
    }
  }

  // Close edit modal
  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditingSegment(null)
    setAvailableVoices([])
    setRegenerating(false)
  }

  // Save segment edits (without regenerating)
  const handleSaveEdits = () => {
    if (!editingSegment || !timeline) return

    // Update segment in timeline
    const updatedTracks = timeline.tracks.map((track) => ({
      ...track,
      segments: track.segments.map((seg) =>
        seg.segment_id === editingSegment.segment_id
          ? {
              ...seg,
              text: editedText,
              speed: editedSpeed,
              volume: editedVolume,
              voice_id: selectedVoiceId,
              voice_name: availableVoices.find((v) => v.id === selectedVoiceId)?.name || seg.voice_name
            }
          : seg
      )
    }))

    setTimeline({
      ...timeline,
      tracks: updatedTracks
    })

    setSuccess('Segment aktualisiert!')
    closeEditModal()
  }

  // Regenerate segment with new settings
  const handleRegenerateSegment = async () => {
    if (!editingSegment) return

    setRegenerating(true)
    setError('')

    try {
      // Call backend to regenerate single segment
      const voice = availableVoices.find((v) => v.id === selectedVoiceId)

      if (!voice) {
        setError('Bitte wähle eine Stimme aus')
        setRegenerating(false)
        return
      }

      const result = await ttsService.generateAudio({
        text: editedText,
        provider: editingSegment.provider as TTSProvider,
        voice: selectedVoiceId,
        speed: editedSpeed
      })

      if (!result.ok) {
        setError(result.error.detail)
        setRegenerating(false)
        return
      }

      // Update segment with new audio URL
      if (timeline) {
        const updatedTracks = timeline.tracks.map((track) => ({
          ...track,
          segments: track.segments.map((seg) =>
            seg.segment_id === editingSegment.segment_id
              ? {
                  ...seg,
                  text: editedText,
                  speed: editedSpeed,
                  volume: editedVolume,
                  voice_id: selectedVoiceId,
                  voice_name: voice.name,
                  audio_url: result.value.audioUrl || undefined,
                  duration: result.value.durationSeconds || 0
                }
              : seg
          )
        }))

        setTimeline({
          ...timeline,
          tracks: updatedTracks
        })
      }

      setSuccess('✅ Segment neu generiert!')
      setRegenerating(false)
    } catch (e: any) {
      setError(e.message || 'Fehler beim Regenerieren')
      setRegenerating(false)
    }
  }

  // Play segment audio
  const playSegment = (segment: AudioSegment) => {
    if (!segment.audio_url) {
      setError('Kein Audio verfügbar für dieses Segment')
      return
    }

    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    // Create new audio element
    const audio = new Audio(segment.audio_url)
    audio.volume = segment.volume
    audio.playbackRate = segment.speed

    audio.onended = () => {
      setPlayingSegmentId(null)
    }

    audio.onerror = () => {
      setError('Fehler beim Abspielen des Audios')
      setPlayingSegmentId(null)
    }

    audio.play()
    audioRef.current = audio
    setPlayingSegmentId(segment.segment_id)
  }

  // Stop playback
  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingSegmentId(null)
  }

  // Delete segment
  const handleDeleteSegment = (segmentId: string) => {
    if (!timeline) return

    if (!confirm('Möchtest du dieses Segment wirklich löschen?')) return

    const updatedTracks = timeline.tracks.map((track) => ({
      ...track,
      segments: track.segments.filter((seg) => seg.segment_id !== segmentId)
    }))

    setTimeline({
      ...timeline,
      tracks: updatedTracks
    })

    setSuccess('Segment gelöscht')
  }

  // Export final podcast
  const handleExport = async () => {
    if (!jobId || !timeline) return

    setExporting(true)
    setError('')
    setSuccess('')

    try {
      // Save timeline updates first
      const updateResult = await productionService.updateTimeline({
        production_job_id: jobId,
        timeline: timeline
      })

      if (!updateResult.ok) {
        setError(updateResult.error.detail)
        setExporting(false)
        return
      }

      // Start export
      const exportResult = await productionService.exportPodcast({
        production_job_id: jobId,
        format: 'mp3',
        quality: 'high',
        normalize: true,
        add_metadata: true
      })

      if (!exportResult.ok) {
        setError(exportResult.error.detail)
        setExporting(false)
        return
      }

      setSuccess('✅ Export erfolgreich! Podcast wird heruntergeladen...')

      // Download file
      if (exportResult.value.download_url) {
        window.location.href = exportResult.value.download_url
      }

      // Redirect to history after 3 seconds
      setTimeout(() => {
        router.push('/dashboard/history')
      }, 3000)
    } catch (e: any) {
      setError(e.message || 'Fehler beim Export')
      setExporting(false)
    }
  }

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
        <LoadingSpinner size="large" message="Lade Timeline..." />
      </div>
    )
  }

  if (!timeline) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorAlert message="Timeline nicht gefunden" />
      </div>
    )
  }

  const currentTrack = timeline.tracks[selectedTrack] || null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with DashboardNavbar */}
      <DashboardNavbar>
        <Button onClick={() => router.push('/dashboard')} className="text-xs md:text-sm px-2 md:px-4">
          ← Zurück
        </Button>
        <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">🎬 Timeline Editor</h1>
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Dauer:</strong> {Math.round(timeline.total_duration)}s
          </div>
          <Button
            variant="primary"
            size="medium"
            onClick={handleExport}
            disabled={exporting}
            loading={exporting}
          >
            {exporting ? 'Exportiere...' : '📦 Export Podcast'}
          </Button>
        </div>
      </DashboardNavbar>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
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

        {/* Track Selector */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tracks</h2>
          <div className="flex gap-3">
            {timeline.tracks.map((track, idx) => (
              <Button
                key={track.track_id}
                variant={selectedTrack === idx ? 'primary' : 'outline'}
                size="medium"
                onClick={() => setSelectedTrack(idx)}
              >
                {track.track_type === 'speech' && '🎤'}
                {track.track_type === 'music' && '🎵'}
                {track.track_type === 'sfx' && '🔊'}
                {' '}
                {track.track_name}
                {' '}
                ({track.segments.length})
              </Button>
            ))}
          </div>
        </Card>

        {/* Segments List */}
        <Card>
          {!currentTrack ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">Track nicht gefunden</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Segments - {currentTrack.track_name}
                </h2>
                <div className="text-sm text-gray-600">
                  {currentTrack.segments.length} Segmente
                </div>
              </div>

              {currentTrack.segments.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">Keine Segmente in diesem Track</p>
                  <p className="text-sm">
                    {currentTrack.track_type === 'music' && 'Füge Hintergrundmusik hinzu'}
                    {currentTrack.track_type === 'sfx' && 'Füge Soundeffekte hinzu'}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {currentTrack.segments.map((segment) => (
              <div
                key={segment.segment_id}
                className="p-5 border-2 border-gray-200 rounded-xl bg-white hover:border-indigo-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Segment Number */}
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
                    {segment.segment_number}
                  </div>

                  {/* Segment Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {segment.character_name || 'Unbekannt'}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {segment.voice_name} ({segment.provider})
                      </span>
                      {segment.status === 'completed' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✅ Fertig
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {segment.text}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>🕐 {segment.duration.toFixed(1)}s</span>
                      <span>⚡ {segment.speed}x</span>
                      <span>🔊 {Math.round(segment.volume * 100)}%</span>
                      {segment.emotion && <span>😊 {segment.emotion}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Play/Stop Button */}
                    {playingSegmentId === segment.segment_id ? (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={stopPlayback}
                      >
                        ⏹️
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => playSegment(segment)}
                        disabled={!segment.audio_url}
                      >
                        ▶️
                      </Button>
                    )}

                    {/* Edit Button */}
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => openEditModal(segment)}
                    >
                      ✏️ Bearbeiten
                    </Button>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleDeleteSegment(segment.segment_id)}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      {editModalOpen && editingSegment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Segment {editingSegment.segment_number} bearbeiten
                </h2>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={closeEditModal}
                >
                  ✕
                </Button>
              </div>

              {/* Error/Success in Modal */}
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

              {/* Text Editor */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Text
                </label>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Segment-Text..."
                />
              </div>

              {/* Voice Picker */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Stimme
                </label>
                <select
                  value={selectedVoiceId}
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availableVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} {voice.language && `[${voice.language}]`} {voice.gender && `(${voice.gender})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed Slider */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Geschwindigkeit: {editedSpeed.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={editedSpeed}
                  onChange={(e) => setEditedSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x (langsamer)</span>
                  <span>1.0x (normal)</span>
                  <span>2.0x (schneller)</span>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Lautstärke: {Math.round(editedVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={editedVolume}
                  onChange={(e) => setEditedVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0% (stumm)</span>
                  <span>50%</span>
                  <span>100% (max)</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="medium"
                  fullWidth
                  onClick={handleSaveEdits}
                  disabled={regenerating}
                >
                  💾 Speichern (ohne Regenerierung)
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  fullWidth
                  onClick={handleRegenerateSegment}
                  disabled={regenerating}
                  loading={regenerating}
                >
                  {regenerating ? 'Regeneriere...' : '🔄 Regenerieren & Speichern'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TimelineEditorPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="large" message="Lädt..." />}>
      <TimelineEditorContent />
    </Suspense>
  )
}
