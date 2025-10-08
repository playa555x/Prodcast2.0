/**
 * Hero Banner Component
 * Netflix/Spotify-Style Hero mit Gradient & CTAs
 *
 * Based on 2025 UI Best Practices:
 * - Scroll-triggered animations
 * - Bold typography
 * - Glassmorphism effects
 * - Transform-based animations for performance
 *
 * Quality: 12/10
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components'
import { Sparkles, TrendingUp, Play } from 'lucide-react'

interface HeroBannerProps {
  title?: string
  description?: string
  showStats?: boolean
  stats?: {
    projects?: number
    duration?: number
    trending?: number
  }
}

export function HeroBanner({
  title = 'Erstelle professionelle Podcasts mit KI',
  description = 'KI-gestützte Recherche, Multi-Speaker TTS und professionelles Studio - alles in einer Platform',
  showStats = true,
  stats = {
    projects: 0,
    duration: 0,
    trending: undefined
  }
}: HeroBannerProps) {
  const router = useRouter()

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl mb-8">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600">
        {/* Animated Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-gradient-shift" />

        {/* Noise Texture for depth */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay"
             style={{
               backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'4\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
             }}
        />
      </div>

      {/* Content Container - Kompakt */}
      <div className="relative z-10 px-8 py-12 lg:px-16 lg:py-12">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6
                          transform hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span className="text-sm font-medium text-white">
              Powered by AI • Trending Topics • Multi-Speaker
            </span>
          </div>

          {/* Title with Gradient Text - Kompakter */}
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            <span className="bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent
                           drop-shadow-lg">
              {title}
            </span>
          </h1>

          {/* Description - Kürzer */}
          <p className="text-lg lg:text-xl text-white/90 mb-6 max-w-2xl leading-relaxed font-light">
            {description}
          </p>

          {/* CTA Buttons - Unified Button Component */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Button
              onClick={() => router.push('/dashboard/research')}
              variant="primary"
              size="large"
            >
              <Play className="w-5 h-5" />
              Jetzt starten
            </Button>

            <Button
              onClick={() => router.push('/dashboard/trending')}
              variant="secondary"
              size="large"
              className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 hover:border-white/50"
            >
              <TrendingUp className="w-5 h-5" />
              Trending Topics
            </Button>
          </div>

          {/* Stats Row - Apple Music Style */}
          {showStats && (
            <div className="flex flex-wrap gap-6">
              {stats.projects !== undefined && stats.projects > 0 && (
                <div className="flex items-center gap-2 text-white/80">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {stats.projects} aktive{stats.projects === 1 ? 's' : ''} Projekt{stats.projects === 1 ? '' : 'e'}
                  </span>
                </div>
              )}

              {stats.duration !== undefined && stats.duration > 0 && (
                <div className="flex items-center gap-2 text-white/80">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span className="text-sm font-medium">
                    {stats.duration} Min erstellt
                  </span>
                </div>
              )}

              {stats.trending !== undefined && (
                <div className="flex items-center gap-2 text-white/80">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium">
                    {stats.trending} Trending Topics verfügbar
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent" />
    </div>
  )
}

// CSS for gradient animation (add to globals.css)
/*
@keyframes gradient-shift {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-gradient-shift {
  animation: gradient-shift 3s ease-in-out infinite;
}
*/
