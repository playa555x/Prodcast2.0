/**
 * AI Topic Suggestions Component
 * KI-generierte Themenvorschläge mit Checkbox-Genehmigung
 *
 * Features:
 * - Themenvorschläge von KI
 * - Einzelne Checkboxen pro Thema
 * - "Alle auswählen" Option
 * - Selektive Genehmigung
 * - Trend-basierte Vorschläge
 *
 * Quality: 12/10
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components'
import {
  Sparkles,
  CheckSquare,
  Square,
  TrendingUp,
  Clock,
  Users,
  Zap,
  Brain
} from 'lucide-react'

export interface TopicSuggestion {
  id: string
  title: string
  description: string
  relevance: number // 0-100
  trendingScore?: number
  estimatedDuration: number // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  source: 'ai' | 'trending' | 'personalized'
  reasoning: string // Why this topic was suggested
}

interface AITopicSuggestionsProps {
  suggestions: TopicSuggestion[]
  onApprove: (selectedTopics: TopicSuggestion[]) => void
  onRegenerate: () => void
  loading?: boolean
}

export function AITopicSuggestions({
  suggestions,
  onApprove,
  onRegenerate,
  loading = false
}: AITopicSuggestionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Update select all state when selection changes
  useEffect(() => {
    setSelectAll(selectedIds.size === suggestions.length && suggestions.length > 0)
  }, [selectedIds, suggestions.length])

  const toggleTopic = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(suggestions.map(s => s.id)))
    }
  }

  const handleApprove = () => {
    const selected = suggestions.filter(s => selectedIds.has(s.id))
    onApprove(selected)
  }

  const getSourceIcon = (source: TopicSuggestion['source']) => {
    switch (source) {
      case 'trending':
        return <TrendingUp className="w-4 h-4" />
      case 'personalized':
        return <Users className="w-4 h-4" />
      default:
        return <Brain className="w-4 h-4" />
    }
  }

  const getDifficultyColor = (difficulty: TopicSuggestion['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      case 'advanced':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20'
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            KI generiert Themenvorschläge...
          </span>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Keine Themenvorschläge verfügbar
          </p>
          <Button onClick={onRegenerate} variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Neue Vorschläge generieren
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                KI-Themenvorschläge
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {suggestions.length} Vorschläge basierend auf aktuellen Trends
              </p>
            </div>
          </div>

          <Button onClick={onRegenerate} variant="outline" size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Neu generieren
          </Button>
        </div>

        {/* Select All */}
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          {selectAll ? (
            <CheckSquare className="w-5 h-5 text-purple-600" />
          ) : (
            <Square className="w-5 h-5" />
          )}
          Alle auswählen ({selectedIds.size}/{suggestions.length})
        </button>
      </div>

      {/* Suggestions List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
        {suggestions.map((suggestion) => {
          const isSelected = selectedIds.has(suggestion.id)

          return (
            <div
              key={suggestion.id}
              className={`p-6 transition-colors ${
                isSelected
                  ? 'bg-purple-50 dark:bg-purple-900/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTopic(suggestion.id)}
                  className="mt-1 flex-shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title & Source */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {suggestion.title}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getSourceIcon(suggestion.source)}
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {suggestion.source}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {suggestion.description}
                  </p>

                  {/* Reasoning */}
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-900 dark:text-blue-200">
                      <strong>Warum dieses Thema:</strong> {suggestion.reasoning}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Difficulty */}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(suggestion.difficulty)}`}>
                      {suggestion.difficulty}
                    </span>

                    {/* Duration */}
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {suggestion.estimatedDuration} Min
                    </div>

                    {/* Relevance Score */}
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {suggestion.relevance}% Relevanz
                    </div>

                    {/* Tags */}
                    {suggestion.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.size === 0 ? (
              'Wähle Themen aus, die du genehmigen möchtest'
            ) : (
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {selectedIds.size} Thema{selectedIds.size !== 1 ? 'n' : ''} ausgewählt
              </span>
            )}
          </p>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setSelectedIds(new Set())}
              variant="outline"
              size="sm"
              disabled={selectedIds.size === 0}
            >
              Auswahl aufheben
            </Button>
            <Button
              onClick={handleApprove}
              disabled={selectedIds.size === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              {selectedIds.size} Thema{selectedIds.size !== 1 ? 'n' : ''} genehmigen
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
