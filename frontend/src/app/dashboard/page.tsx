/**
 * Dashboard Page - Main User Hub
 * 
 * Features:
 * - User stats display
 * - Feature cards
 * - Navigation
 * - Protected route
 * 
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner, TutorialOverlay, DashboardNavbar } from '@/components'
import { HeroBanner, FeatureCard } from '@/components/dashboard'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/lib/constants'
import type { UserStats } from '@/types'
import { Brain, Mic, Film, TrendingUp, Music, BookOpen, Podcast, Clock, FileText, Sparkles } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth()
  const [expandedStat, setExpandedStat] = useState<string | null>(null)
  const [stats, setStats] = useState<UserStats>({
    userId: '',
    totalCharactersUsed: 0,
    totalAudioGenerated: 0,
    totalCostUsd: 0,
    monthlyCharactersUsed: 0,
    monthlyLimit: 10000,
    remainingCharacters: 10000
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(ROUTES.LOGIN)
    }
  }, [isAuthenticated, authLoading, router])

  // Load stats from backend
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (e) {
        console.error('Failed to load stats:', e)
      }
    }

    loadStats()
  }, [user])

  const features = [
    {
      title: 'AI Podcast Research',
      description: 'Claude-powered multi-source research & script generation',
      IconComponent: Brain,
      route: '/dashboard/research',
      gradient: 'from-blue-500 to-indigo-600',
      badge: 'HIER STARTEN',
      dataFeature: 'ai-research'
    },
    {
      title: 'Text to Speech',
      description: 'Multi-speaker audio generation with AI scripts',
      IconComponent: Mic,
      route: ROUTES.TTS,
      gradient: 'from-indigo-500 to-purple-500',
      badge: 'MULTI-SPEAKER'
    },
    {
      title: 'Professional Studio',
      description: 'Timeline editor with waveforms & multi-track',
      IconComponent: Film,
      route: '/dashboard/studio?job=demo',
      gradient: 'from-fuchsia-600 to-pink-600',
      badge: 'DER LETZTE SCHLIFF'
    },
    {
      title: 'Trending Topics',
      description: 'Discover trending topics & podcast ideas',
      IconComponent: TrendingUp,
      route: '/dashboard/trending',
      gradient: 'from-orange-500 to-amber-500'
    },
    {
      title: 'Voice Library',
      description: 'Manage used voices with previews',
      IconComponent: Music,
      route: '/dashboard/voice-library',
      gradient: 'from-rose-500 to-orange-500'
    },
    {
      title: 'History',
      description: 'All finished podcasts & downloads',
      IconComponent: BookOpen,
      route: '/dashboard/history',
      gradient: 'from-teal-500 to-cyan-500'
    }
  ]

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Tutorial Overlay */}
      <TutorialOverlay />

      {/* Header with DashboardNavbar */}
      <DashboardNavbar>
        <h1 className="text-xl md:text-2xl font-black tracking-tight whitespace-nowrap bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Podcast<span className="text-orange-500">•</span>Agent
        </h1>
      </DashboardNavbar>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Hero Banner - Kompakt */}
        <div className="mb-6">
          <HeroBanner
            stats={{
              projects: stats.totalAudioGenerated,
              duration: stats.totalDurationMinutes || 0,
              trending: stats.trendingTopicsCount
            }}
          />
        </div>

        {/* All Features Section */}
        <section className="mb-6 py-4 md:py-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 -mx-4 md:-mx-6 px-4 md:px-6 rounded-2xl">
          <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Alle Features</h2>

          {/* Gradient Background Layer */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/50 via-purple-400/50 to-orange-400/50 dark:from-blue-500/60 dark:via-purple-500/60 dark:to-orange-500/60 rounded-2xl blur-3xl" />

            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-tutorial="feature-cards">
            {features.map((feature, index) => {
              const accentColors = ['#3b82f6', '#6366f1', '#c026d3', '#f97316', '#f43f5e', '#14b8a6']

              // Calculate grid position (3 columns)
              const row = Math.floor(index / 3)
              const col = index % 3

              // Get neighbor colors for all 4 directions
              const rightIndex = (col < 2) ? index + 1 : null
              const leftIndex = (col > 0) ? index - 1 : null
              const belowIndex = (row < 1) ? index + 3 : null
              const aboveIndex = (row > 0) ? index - 3 : null

              const rightColor = rightIndex !== null && rightIndex < accentColors.length ? accentColors[rightIndex] : undefined
              const leftColor = leftIndex !== null && leftIndex >= 0 ? accentColors[leftIndex] : undefined
              const belowColor = belowIndex !== null && belowIndex < accentColors.length ? accentColors[belowIndex] : undefined
              const aboveColor = aboveIndex !== null && aboveIndex >= 0 ? accentColors[aboveIndex] : undefined

              return (
                <FeatureCard
                  key={index}
                  title={feature.title}
                  description={feature.description}
                  IconComponent={feature.IconComponent}
                  route={feature.route}
                  gradient={feature.gradient}
                  badge={feature.badge}
                  index={index}
                  accentColor={accentColors[index] || 'gray'}
                  rightAccentColor={rightColor}
                  belowAccentColor={belowColor}
                  leftAccentColor={leftColor}
                  aboveAccentColor={aboveColor}
                  dataFeature={feature.dataFeature}
                />
              )
            })}
            </div>
          </div>
        </section>

        {/* Stats Section mit Lucide Icons */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            {
              label: 'Podcasts',
              value: stats.totalAudioGenerated || '—',
              Icon: Podcast,
              gradient: 'from-blue-500 to-cyan-500',
              borderColor: '#3b82f6',
              details: [
                { label: 'Erster Podcast', value: stats.firstPodcastDate ? new Date(stats.firstPodcastDate).toLocaleDateString('de-DE') : '—' },
                { label: 'Letzter Podcast', value: stats.lastPodcastDate ? new Date(stats.lastPodcastDate).toLocaleDateString('de-DE') : '—' },
                { label: 'Durchschn. Länge', value: stats.averageDuration ? `${Math.round(stats.averageDuration)} Min` : '—' },
                { label: 'Längster', value: stats.longestDuration ? `${Math.round(stats.longestDuration)} Min` : '—' }
              ]
            },
            {
              label: 'Dauer',
              value: stats.totalDurationMinutes ? `${Math.round(stats.totalDurationMinutes)} Min` : '—',
              Icon: Clock,
              gradient: 'from-purple-500 to-pink-500',
              borderColor: '#a855f7',
              details: [
                { label: 'Kürzester', value: stats.shortestDuration ? `${Math.round(stats.shortestDuration)} Min` : '—' },
                { label: 'Längster', value: stats.longestDuration ? `${Math.round(stats.longestDuration)} Min` : '—' },
                { label: 'Durchschnitt', value: stats.averageDuration ? `${Math.round(stats.averageDuration)} Min` : '—' },
                { label: 'Gesamt', value: stats.totalDurationMinutes ? `${Math.round(stats.totalDurationMinutes)} Min` : '—' }
              ]
            },
            {
              label: 'Zeichen',
              value: stats.totalCharactersUsed ? stats.totalCharactersUsed.toLocaleString('de-DE') : '—',
              Icon: FileText,
              gradient: 'from-orange-500 to-red-500',
              borderColor: '#f97316',
              details: [
                { label: 'Meiste Zeichen', value: stats.maxCharacters ? stats.maxCharacters.toLocaleString('de-DE') : '—' },
                { label: 'Wenigste', value: stats.minCharacters ? stats.minCharacters.toLocaleString('de-DE') : '—' },
                { label: 'Durchschnitt', value: stats.averageCharacters ? Math.round(stats.averageCharacters).toLocaleString('de-DE') : '—' },
                { label: 'Gesamt', value: stats.totalCharactersUsed ? stats.totalCharactersUsed.toLocaleString('de-DE') : '—' }
              ]
            },
            {
              label: 'Verfügbar',
              value: stats.remainingCharacters ? stats.remainingCharacters.toLocaleString('de-DE') : '—',
              Icon: Sparkles,
              gradient: 'from-green-500 to-emerald-500',
              borderColor: '#10b981',
              details: [
                { label: 'Monatslimit', value: stats.monthlyLimit ? stats.monthlyLimit.toLocaleString('de-DE') : '—' },
                { label: 'Verbraucht', value: stats.monthlyCharactersUsed ? stats.monthlyCharactersUsed.toLocaleString('de-DE') : '—' },
                { label: 'Verfügbar', value: stats.remainingCharacters ? stats.remainingCharacters.toLocaleString('de-DE') : '—' },
                { label: 'Prozent genutzt', value: (stats.monthlyLimit && stats.monthlyCharactersUsed) ? `${Math.round((stats.monthlyCharactersUsed / stats.monthlyLimit) * 100)}%` : '—' }
              ]
            }
          ].map((stat) => (
            <div
              key={stat.label}
              onMouseEnter={() => setExpandedStat(stat.label)}
              onMouseLeave={() => setExpandedStat(null)}
              className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0"
              style={{
                borderColor: expandedStat === stat.label ? stat.borderColor : undefined
              }}
            >
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Erweiterte Statistik anzeigen
              </div>

              {/* Glowing Border Effect on Hover */}
              <div
                className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  boxShadow: `0 0 20px ${stat.borderColor}, 0 0 40px ${stat.borderColor}40`
                }}
              />

              {/* Gradient on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity rounded-xl`} />

              <div className="relative z-10 flex items-start gap-4">
                {/* Left: Icon */}
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <stat.Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>

                {/* Center: Value & Label */}
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
                </div>

                {/* Right: Details (shown on hover) */}
                <div className={`flex-1 min-w-0 pl-4 border-l-2 transition-all duration-300 ${
                  expandedStat === stat.label
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-4 pointer-events-none'
                }`}
                  style={{
                    borderColor: expandedStat === stat.label ? stat.borderColor : 'transparent'
                  }}
                >
                  <div className="space-y-2">
                    {stat.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">{detail.label}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
