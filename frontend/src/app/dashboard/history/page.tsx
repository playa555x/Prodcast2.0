/**
 * History Page - Completed Podcasts Archive
 *
 * Features:
 * - Display all finished podcasts
 * - Thumbnails and metadata
 * - Download buttons
 * - Share functionality
 * - Stats (views, downloads, shares)
 * - Filter and search
 * - Delete podcasts
 *
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ErrorAlert, LoadingSpinner, DashboardNavbar } from '@/components'
import type { HistoryEntry } from '@/types'

export default function HistoryPage() {
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(true)
  const [podcasts, setPodcasts] = useState<HistoryEntry[]>([])
  const [filteredPodcasts, setFilteredPodcasts] = useState<HistoryEntry[]>([])
  const [error, setError] = useState('')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'views' | 'downloads'>('recent')

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [sharingPodcast, setSharingPodcast] = useState<HistoryEntry | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Load podcasts
  const loadPodcasts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // TODO: Implement backend endpoint /api/history/list
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/production/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load podcast history')
      }

      const data = await response.json()
      setPodcasts(data.podcasts || [])
      setFilteredPodcasts(data.podcasts || [])
      setLoading(false)
    } catch (e: any) {
      setError(e.message || 'Failed to load podcast history')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPodcasts()
  }, [loadPodcasts])

  // Apply filters
  useEffect(() => {
    let filtered = [...podcasts]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'views') {
      filtered.sort((a, b) => b.view_count - a.view_count)
    } else if (sortBy === 'downloads') {
      filtered.sort((a, b) => b.download_count - a.download_count)
    }

    setFilteredPodcasts(filtered)
  }, [podcasts, searchQuery, sortBy])

  // Open share modal
  const openShareModal = (podcast: HistoryEntry) => {
    setSharingPodcast(podcast)
    setShareUrl(`${window.location.origin}/share/${podcast.production_job_id}`)
    setShareModalOpen(true)
    setCopied(false)
  }

  // Copy share link
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Download podcast
  const handleDownload = (podcast: HistoryEntry) => {
    window.location.href = podcast.download_url
  }

  // Delete podcast
  const handleDelete = async (podcastId: string) => {
    if (!confirm('Möchtest du diesen Podcast wirklich löschen?')) return

    try {
      // TODO: Backend endpoint /api/history/delete
      const updatedPodcasts = podcasts.filter((p) => p.production_job_id !== podcastId)
      setPodcasts(updatedPodcasts)
    } catch (e: any) {
      setError(e.message || 'Fehler beim Löschen')
    }
  }

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Lade History..." />
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
        <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
          📚 Podcast History
        </h1>
        <div className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
          {filteredPodcasts.length} von {podcasts.length} Podcasts
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
        <div className="relative mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(6 182 212), 0 0 40px rgb(6 182 212 / 0.4)' }} />
          <div className="relative z-10">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche nach Titel oder Beschreibung..."
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'recent' ? 'primary' : 'outline'}
                size="small"
                onClick={() => setSortBy('recent')}
              >
                🕐 Neueste
              </Button>
              <Button
                variant={sortBy === 'views' ? 'primary' : 'outline'}
                size="small"
                onClick={() => setSortBy('views')}
              >
                👀 Views
              </Button>
              <Button
                variant={sortBy === 'downloads' ? 'primary' : 'outline'}
                size="small"
                onClick={() => setSortBy('downloads')}
              >
                ⬇️ Downloads
              </Button>
            </div>
          </div>
          </div>
        </div>

        {/* Podcasts List */}
        {filteredPodcasts.length === 0 ? (
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(99 102 241), 0 0 40px rgb(99 102 241 / 0.4)' }} />
            <div className="relative z-10">
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-2">Keine Podcasts gefunden</p>
              <p className="text-sm">Erstelle deinen ersten Podcast!</p>
              <Button
                variant="primary"
                size="medium"
                className="mt-4"
                onClick={() => router.push('/dashboard/research')}
              >
                ➕ Neuen Podcast erstellen
              </Button>
            </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPodcasts.map((podcast) => (
              <div key={podcast.production_job_id} className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
                <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(6 182 212), 0 0 40px rgb(6 182 212 / 0.4)' }} />
                <div className="relative z-10">
                <div className="flex gap-6">
                  {/* Thumbnail */}
                  <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl flex-shrink-0">
                    🎙️
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                          {podcast.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {podcast.description}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span className="ml-4 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                        ✅ {podcast.status}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                      <span>🕐 {formatDuration(podcast.duration_seconds)}</span>
                      <span>💾 {formatFileSize(podcast.file_size_bytes)}</span>
                      <span>👀 {podcast.view_count} Views</span>
                      <span>⬇️ {podcast.download_count} Downloads</span>
                      <span>📅 {formatDate(podcast.created_at)}</span>
                    </div>

                    {/* Shared Platforms */}
                    {podcast.shared_platforms && podcast.shared_platforms.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Geteilt auf:</span>
                        {podcast.shared_platforms.map((platform) => (
                          <span
                            key={platform}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => handleDownload(podcast)}
                      >
                        ⬇️ Download
                      </Button>

                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => openShareModal(podcast)}
                      >
                        🔗 Teilen
                      </Button>

                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => router.push(`/dashboard/timeline?job=${podcast.production_job_id}`)}
                      >
                        ✏️ Bearbeiten
                      </Button>

                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => handleDelete(podcast.production_job_id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareModalOpen && sharingPodcast && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                🔗 Podcast teilen
              </h2>
              <Button
                variant="ghost"
                size="small"
                onClick={() => setShareModalOpen(false)}
              >
                ✕
              </Button>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-2">{sharingPodcast.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{sharingPodcast.description}</p>
            </div>

            {/* Share Link */}
            <div className="mb-6">
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 bg-gray-50"
                />
                <Button
                  variant={copied ? 'primary' : 'outline'}
                  size="medium"
                  onClick={copyShareLink}
                >
                  {copied ? '✅ Kopiert!' : '📋 Kopieren'}
                </Button>
              </div>
            </div>

            {/* Social Media Buttons */}
            <div className="mb-6">
              <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Auf Social Media teilen
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="medium"
                  fullWidth
                  onClick={() => {
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        sharingPodcast.title
                      )}&url=${encodeURIComponent(shareUrl)}`,
                      '_blank'
                    )
                  }}
                >
                  🐦 Twitter
                </Button>

                <Button
                  variant="outline"
                  size="medium"
                  fullWidth
                  onClick={() => {
                    window.open(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                        shareUrl
                      )}`,
                      '_blank'
                    )
                  }}
                >
                  💼 LinkedIn
                </Button>

                <Button
                  variant="outline"
                  size="medium"
                  fullWidth
                  onClick={() => {
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                        shareUrl
                      )}`,
                      '_blank'
                    )
                  }}
                >
                  📘 Facebook
                </Button>

                <Button
                  variant="outline"
                  size="medium"
                  fullWidth
                  onClick={() => {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(
                        `${sharingPodcast.title} ${shareUrl}`
                      )}`,
                      '_blank'
                    )
                  }}
                >
                  💬 WhatsApp
                </Button>
              </div>
            </div>

            {/* Download Button */}
            <Button
              variant="primary"
              size="large"
              fullWidth
              onClick={() => {
                handleDownload(sharingPodcast)
                setShareModalOpen(false)
              }}
            >
              ⬇️ Podcast herunterladen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
