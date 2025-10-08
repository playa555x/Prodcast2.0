/**
 * Tutorial Overlay Component
 *
 * Interactive onboarding tutorial with step-by-step guidance
 * Users must interact with elements to progress
 *
 * Quality: 12/10
 * Last updated: 2025-10-08
 */

'use client'

import React, { useState, useEffect } from 'react'
import { X, MousePointer2 } from 'lucide-react'

const TUTORIAL_STEPS = [
  {
    title: 'Willkommen! 👋',
    description: 'Erstelle professionelle KI-Podcasts in wenigen Schritten',
    instruction: 'Klicke auf "Weiter" um zu starten',
    target: null,
    position: 'center',
    id: 'welcome'
  },
  {
    title: 'Projekt erstellen',
    description: 'Hier wählst du dein Projekt aus oder erstellst ein neues',
    instruction: '👆 Klicke auf "Projekt wählen" um fortzufahren',
    target: 'project-selector',
    position: 'bottom',
    id: 'project'
  },
  {
    title: 'Feature wählen',
    description: 'Wähle eine Karte aus, um mit deinem Podcast zu starten',
    instruction: '👆 Klicke auf eine der Feature-Karten',
    target: 'feature-cards',
    position: 'top',
    id: 'features'
  }
]

const AI_RESEARCH_EXPLANATION = {
  title: 'AI Podcast Research 🧠',
  description: 'Das mächtigste Feature für professionelle Podcasts',
  instruction: 'Klicke irgendwo um fortzufahren',
  details: [
    'Claude-powered Multi-Source Research',
    'Automatische Skript-Generierung',
    'Web-Recherche & Faktencheck',
    'Professionelle Struktur & Flow'
  ]
}

export function TutorialOverlay() {
  const [isVisible, setIsVisible] = useState(false)
  const [showResearchExplanation, setShowResearchExplanation] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    // Check if tutorial was already completed
    const tutorialCompleted = localStorage.getItem('tutorial_completed')
    if (!tutorialCompleted) {
      setTimeout(() => setIsVisible(true), 1000)
    }

    // Check if user clicks on AI Research for first time
    const researchExplained = localStorage.getItem('research_explained')
    if (!researchExplained) {
      const handleResearchClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        const researchCard = target.closest('[data-feature="ai-research"]')
        if (researchCard && !showResearchExplanation) {
          e.preventDefault()
          e.stopPropagation()
          setShowResearchExplanation(true)
          localStorage.setItem('research_explained', 'true')
        }
      }

      document.addEventListener('click', handleResearchClick, true)
      return () => document.removeEventListener('click', handleResearchClick, true)
    }
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const step = TUTORIAL_STEPS[currentStep]
    if (step.target) {
      const element = document.querySelector(`[data-tutorial="${step.target}"]`)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)
      }
    } else {
      setTargetRect(null)
    }
  }, [currentStep, isVisible])

  // Listen for clicks on tutorial targets
  useEffect(() => {
    if (!isVisible) return

    const step = TUTORIAL_STEPS[currentStep]
    if (!step.target) return

    const handleClick = (e: MouseEvent) => {
      const element = document.querySelector(`[data-tutorial="${step.target}"]`)
      if (element && element.contains(e.target as Node)) {
        nextStep()
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [currentStep, isVisible])

  const handleDismiss = () => {
    localStorage.setItem('tutorial_completed', 'true')
    setIsVisible(false)
  }

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleDismiss()
    }
  }

  // Show Research Explanation
  if (showResearchExplanation) {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-auto" onClick={() => setShowResearchExplanation(false)}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Explanation Card - Centered */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-purple-500/30 overflow-hidden animate-slide-in">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2">{AI_RESEARCH_EXPLANATION.title}</h2>
                <p className="text-white/90 text-sm">{AI_RESEARCH_EXPLANATION.description}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-3 mb-6">
                {AI_RESEARCH_EXPLANATION.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">{idx + 1}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">{detail}</p>
                  </div>
                ))}
              </div>

              <p className="text-purple-600 dark:text-purple-400 font-medium text-sm text-center mb-4">
                {AI_RESEARCH_EXPLANATION.instruction}
              </p>

              <button
                onClick={() => setShowResearchExplanation(false)}
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Verstanden, los geht's!
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isVisible) return null

  const step = TUTORIAL_STEPS[currentStep]

  const getCardPosition = () => {
    if (!targetRect || step.position === 'center') {
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    }

    if (step.position === 'bottom') {
      return `top-[${targetRect.bottom + 20}px] left-1/2 -translate-x-1/2`
    }

    if (step.position === 'top') {
      return `bottom-[${window.innerHeight - targetRect.top + 20}px] left-1/2 -translate-x-1/2`
    }

    return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop with cutout for target element */}
      <div className="absolute inset-0 pointer-events-auto">
        <svg className="w-full h-full">
          <defs>
            <mask id="tutorial-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#tutorial-mask)"
            className="backdrop-blur-sm"
          />
        </svg>
      </div>

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="absolute pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16
          }}
        >
          <div className="absolute inset-0 rounded-xl border-4 border-purple-500 shadow-2xl shadow-purple-500/50" />
          <div className="absolute inset-0 rounded-xl border-4 border-purple-400 animate-ping" />
        </div>
      )}

      {/* Animated pointer */}
      {step.target && targetRect && (
        <div
          className="absolute pointer-events-none animate-bounce"
          style={{
            left: targetRect.left + targetRect.width / 2 - 12,
            top: targetRect.top - 40
          }}
        >
          <MousePointer2 className="w-6 h-6 text-purple-500" />
        </div>
      )}

      {/* Tutorial Card */}
      <div className={`absolute w-full max-w-md mx-4 pointer-events-auto transition-all duration-500 ${getCardPosition()}`}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-purple-500/30 overflow-hidden animate-slide-in">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{step.title}</h2>
                <p className="text-white/90 text-xs">
                  Schritt {currentStep + 1} von {TUTORIAL_STEPS.length}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              {step.description}
            </p>
            <p className="text-purple-600 dark:text-purple-400 font-medium text-sm mb-4">
              {step.instruction}
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {TUTORIAL_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-6 bg-purple-600'
                      : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Only show next button on first step */}
            {currentStep === 0 && (
              <button
                onClick={nextStep}
                className="w-full px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Weiter
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="w-full mt-2 px-4 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Tutorial überspringen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
