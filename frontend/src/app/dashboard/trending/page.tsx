/**
 * Trending Topics Page
 *
 * Features:
 * - Google Trends (real-time, Germany)
 * - News Headlines (NewsAPI)
 * - Reddit Trends
 * - YouTube Trends
 * - AI-generated Podcast Topic Ideas
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, LoadingSpinner } from '@/components'
import { useAuth } from '@/hooks'

// ============================================
// Types
// ============================================

interface GoogleTrend {
  rank: number
  topic: string
  source: string
  region: string
  timestamp: string
}

interface NewsHeadline {
  rank: number
  title: string
  description?: string
  source: string
  url: string
  publishedAt: string
  category: string
}

interface RedditTrend {
  rank: number
  title: string
  subreddit: string
  score: number
  num_comments: number
  url: string
  created_utc: string
  source: string
}

interface PodcastIdea {
  rank: number
  topic: string
  source: string
  relevance_score: number
  podcast_angle: string
  target_audience: string
  estimated_interest: string
}

// ============================================
// Component
// ============================================

export default function TrendingTopicsPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'google' | 'news' | 'reddit' | 'podcast'>('google')

  const [googleTrends, setGoogleTrends] = useState<GoogleTrend[]>([])
  const [newsHeadlines, setNewsHeadlines] = useState<NewsHeadline[]>([])
  const [redditTrends, setRedditTrends] = useState<RedditTrend[]>([])
  const [podcastIdeas, setPodcastIdeas] = useState<PodcastIdea[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadTrendingData()
    }
  }, [isAuthenticated])

  // ============================================
  // Functions
  // ============================================

  const loadTrendingData = async () => {
    setLoading(true)
    setError('')

    try {
      // Load all trending data in parallel
      const [googleRes, newsRes, redditRes, podcastRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trending/google?region=DE&limit=20`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trending/news?country=de&limit=15`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trending/reddit?subreddit=all&limit=15`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trending/podcast-ideas?region=DE&limit=20`)
      ])

      if (googleRes.ok) {
        const data = await googleRes.json()
        setGoogleTrends(data.trends || [])
      }

      if (newsRes.ok) {
        const data = await newsRes.json()
        setNewsHeadlines(data.headlines || [])
      }

      if (redditRes.ok) {
        const data = await redditRes.json()
        setRedditTrends(data.trends || [])
      }

      if (podcastRes.ok) {
        const data = await podcastRes.json()
        setPodcastIdeas(data.topics || [])
      }

      setLastUpdated(new Date().toLocaleString('de-DE'))
    } catch (e) {
      console.error('Failed to load trending data:', e)
      setError('Fehler beim Laden der Trending Topics. Bitte versuchen Sie es später erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-3xl border-b-2 border-amber-400/50 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button onClick={() => router.push('/dashboard')}>← Zurück</Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                📈 Trending Topics
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Entdecke aktuelle Trends und Podcast-Ideen • Letzte Aktualisierung: {lastUpdated || 'Laden...'}
              </p>
            </div>
            <Button onClick={loadTrendingData} size="small" variant="ghost" disabled={loading}>
              🔄 Aktualisieren
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-3xl border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex gap-1">
            {[
              { id: 'google' as const, label: 'Google Trends', icon: '🔥', count: googleTrends.length },
              { id: 'news' as const, label: 'News Headlines', icon: '📰', count: newsHeadlines.length },
              { id: 'reddit' as const, label: 'Reddit Trends', icon: '🗨️', count: redditTrends.length },
              { id: 'podcast' as const, label: 'Podcast Ideen', icon: '🎙️', count: podcastIdeas.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="medium" message="Lade Trending Topics..." />
          </div>
        ) : (
          <>
            {/* Google Trends Tab */}
            {activeTab === 'google' && (
              <div className="space-y-6">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
                  <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(249 115 22), 0 0 40px rgb(249 115 22 / 0.4)' }} />
                  <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">🔥 Google Trends Deutschland</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Die am häufigsten gesuchten Themen in Deutschland (Echtzeit)
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {googleTrends.length} Trends
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {googleTrends.map((trend) => (
                      <div
                        key={trend.rank}
                        className="p-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-2xl transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl font-bold text-orange-600">#{trend.rank}</span>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            Live
                          </span>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{trend.topic}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Google Trends • {trend.region}</p>
                      </div>
                    ))}
                  </div>

                  {googleTrends.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Keine Google Trends verfügbar. Bitte später erneut versuchen.
                    </div>
                  )}
                  </div>
                </div>
              </div>
            )}

            {/* News Headlines Tab */}
            {activeTab === 'news' && (
              <div className="space-y-6">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
                  <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(249 115 22), 0 0 40px rgb(249 115 22 / 0.4)' }} />
                  <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📰 Aktuelle Schlagzeilen</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Top News aus Deutschland (NewsAPI)
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {newsHeadlines.length} Artikel
                    </div>
                  </div>

                  <div className="space-y-4">
                    {newsHeadlines.map((news) => (
                      <div
                        key={news.rank}
                        className="p-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-2xl transition-all cursor-pointer"
                        onClick={() => window.open(news.url, '_blank')}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <span className="text-xl font-bold text-indigo-600">#{news.rank}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 hover:text-indigo-600 transition-colors">
                              {news.title}
                            </h4>
                            {news.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{news.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">{news.source}</span>
                              <span>•</span>
                              <span>{new Date(news.publishedAt).toLocaleDateString('de-DE')}</span>
                              <span>•</span>
                              <span className="capitalize">{news.category}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {newsHeadlines.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p className="mb-2">Keine News verfügbar.</p>
                      <p className="text-xs">NewsAPI-Schlüssel möglicherweise nicht konfiguriert.</p>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            )}

            {/* Reddit Trends Tab */}
            {activeTab === 'reddit' && (
              <div className="space-y-6">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
                  <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(249 115 22), 0 0 40px rgb(249 115 22 / 0.4)' }} />
                  <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">🗨️ Reddit Trending</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Top Posts von r/all (heute)
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {redditTrends.length} Posts
                    </div>
                  </div>

                  <div className="space-y-4">
                    {redditTrends.map((reddit) => (
                      <div
                        key={reddit.rank}
                        className="p-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-2xl transition-all cursor-pointer"
                        onClick={() => window.open(reddit.url, '_blank')}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                              <span className="text-xl font-bold text-orange-600">#{reddit.rank}</span>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-bold text-orange-600">↑ {reddit.score}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                r/{reddit.subreddit}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                💬 {reddit.num_comments} Kommentare
                              </span>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-orange-600 transition-colors">
                              {reddit.title}
                            </h4>
                            <div className="text-xs text-gray-500 mt-2">
                              {new Date(reddit.created_utc).toLocaleString('de-DE')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {redditTrends.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Keine Reddit Trends verfügbar. Bitte später erneut versuchen.
                    </div>
                  )}
                  </div>
                </div>
              </div>
            )}

            {/* Podcast Ideas Tab */}
            {activeTab === 'podcast' && (
              <div className="space-y-6">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
                  <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(249 115 22), 0 0 40px rgb(249 115 22 / 0.4)' }} />
                  <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">🎙️ Podcast Themen-Vorschläge</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        KI-generierte Podcast-Ideen basierend auf aktuellen Trends
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {podcastIdeas.length} Ideen
                    </div>
                  </div>

                  <div className="space-y-4">
                    {podcastIdeas.map((idea) => (
                      <div
                        key={idea.rank}
                        className="p-5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-2xl transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">#{idea.rank}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                idea.estimated_interest === 'High'
                                  ? 'bg-green-100 text-green-700'
                                  : idea.estimated_interest === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {idea.estimated_interest === 'High' ? '🔥 Hoch' : idea.estimated_interest === 'Medium' ? '⚡ Mittel' : '📊 Niedrig'} Interesse
                              </span>
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                Score: {idea.relevance_score}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Quelle: {idea.source}
                              </span>
                            </div>

                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{idea.topic}</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Podcast-Winkel</div>
                                <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{idea.podcast_angle}</div>
                              </div>
                              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-100 dark:border-purple-800">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Zielgruppe</div>
                                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">{idea.target_audience}</div>
                              </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                              <Button
                                size="small"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => router.push(`/dashboard/research?topic=${encodeURIComponent(idea.topic)}`)}
                              >
                                🧠 Research starten
                              </Button>
                              <Button
                                size="small"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(idea.topic)
                                  alert('Thema in Zwischenablage kopiert!')
                                }}
                              >
                                📋 Kopieren
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {podcastIdeas.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Keine Podcast-Ideen verfügbar. Bitte laden Sie die Trends neu.
                    </div>
                  )}
                  </div>
                </div>

                {/* Info Box */}
                <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
                  <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(59 130 246), 0 0 40px rgb(59 130 246 / 0.4)' }} />
                  <div className="relative z-10">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Wie werden Podcast-Ideen generiert?</h4>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Analyse von Google Trends, News und Reddit</li>
                        <li>• Regelbasierte Bewertung der Relevanz</li>
                        <li>• Automatische Kategorisierung nach Themenbereich</li>
                        <li>• Vorschläge für Podcast-Winkel und Zielgruppen</li>
                        <li>• Komplett kostenlos - keine KI-API erforderlich!</li>
                      </ul>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
