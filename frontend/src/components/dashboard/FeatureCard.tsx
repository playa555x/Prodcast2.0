/**
 * Feature Card Component
 *
 * Interactive card with mouse-tracking gradient effect.
 * Gradient transitions based on mouse position.
 *
 * Quality: 12/10
 * Last updated: 2025-10-08
 */

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  title: string
  description: string
  IconComponent: LucideIcon
  route: string
  gradient: string
  badge?: string
  index: number
  accentColor: string
  rightAccentColor?: string
  belowAccentColor?: string
  leftAccentColor?: string
  aboveAccentColor?: string
  dataFeature?: string
}

export function FeatureCard({
  title,
  description,
  IconComponent: Icon,
  route,
  gradient,
  badge,
  index,
  accentColor,
  rightAccentColor,
  belowAccentColor,
  leftAccentColor,
  aboveAccentColor,
  dataFeature
}: FeatureCardProps) {
  const router = useRouter()
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMousePos({ x, y })
  }

  // Calculate color mixing based on mouse position
  const getBlendedGradient = () => {
    const baseColor = accentColor

    // Get all neighbor colors (fallback to base if no neighbor)
    const rightColor = rightAccentColor || baseColor
    const belowColor = belowAccentColor || baseColor
    const leftColor = leftAccentColor || baseColor
    const aboveColor = aboveAccentColor || baseColor

    // Calculate mixing weights based on mouse position
    const rightWeight = Math.max(0, mousePos.x - 0.5) * 2 // 0 to 1 when moving right from center
    const leftWeight = Math.max(0, 0.5 - mousePos.x) * 2  // 0 to 1 when moving left from center
    const belowWeight = Math.max(0, mousePos.y - 0.5) * 2 // 0 to 1 when moving down from center
    const aboveWeight = Math.max(0, 0.5 - mousePos.y) * 2 // 0 to 1 when moving up from center

    // Mix colors based on all four directions
    let finalColor = baseColor

    if (rightWeight > 0) {
      finalColor = `color-mix(in srgb, ${finalColor} ${(1 - rightWeight) * 100}%, ${rightColor} ${rightWeight * 100}%)`
    }
    if (leftWeight > 0) {
      finalColor = `color-mix(in srgb, ${finalColor} ${(1 - leftWeight) * 100}%, ${leftColor} ${leftWeight * 100}%)`
    }
    if (belowWeight > 0) {
      finalColor = `color-mix(in srgb, ${finalColor} ${(1 - belowWeight) * 100}%, ${belowColor} ${belowWeight * 100}%)`
    }
    if (aboveWeight > 0) {
      finalColor = `color-mix(in srgb, ${finalColor} ${(1 - aboveWeight) * 100}%, ${aboveColor} ${aboveWeight * 100}%)`
    }

    // Create radial gradient centered on mouse position
    return `radial-gradient(circle 800px at ${mousePos.x * 100}% ${mousePos.y * 100}%, ${finalColor} 0%, ${finalColor} 100%)`
  }

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-visible
                 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer
                 hover:-translate-y-2 border-2 border-gray-200 dark:border-gray-700
                 border-l-4 opacity-0 animate-fade-in-up"
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'forwards',
        borderLeftColor: accentColor
      }}
      onClick={() => route && route !== '#' && router.push(route)}
      onMouseMove={handleMouseMove}
      data-feature={dataFeature}
    >
      {/* Color Bleed Effect - Glow that extends beyond card borders */}
      <div
        className="absolute -inset-4 opacity-0 group-hover:opacity-50 transition-opacity duration-500 blur-2xl -z-20 rounded-xl"
        style={{
          background: getBlendedGradient()
        }}
      />

      {/* Interactive Gradient Overlay based on Mouse Position */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-70 transition-opacity duration-300 -z-10 rounded-xl overflow-hidden"
        style={{
          background: getBlendedGradient()
        }}
      />

      <div className="relative z-10 p-6 flex flex-col h-full">
        {/* Icon with Scale - Lucide Icon with Gradient Background */}
        <div className={`w-14 h-14 mb-4 rounded-xl bg-gradient-to-br ${gradient}
                        flex items-center justify-center
                        transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300
                        shadow-md group-hover:shadow-xl`}>
          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>

        {/* Badge */}
        {badge && (
          <span className="inline-block px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full mb-3 uppercase tracking-wide">
            {badge}
          </span>
        )}

        {/* Title */}
        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-white transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 group-hover:text-white/90 transition-colors mb-4">
          {description}
        </p>

        {/* Arrow CTA - Always at bottom right */}
        <div className="flex items-center justify-end text-purple-600 group-hover:text-white font-medium text-sm mt-auto">
          <span>Los geht's</span>
          <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </div>
  )
}
