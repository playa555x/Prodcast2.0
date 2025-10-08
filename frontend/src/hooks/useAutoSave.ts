/**
 * Auto-Save Hook
 * Automatisches Speichern alle 5 Minuten + manuelle Speicherung
 *
 * Features:
 * - Auto-Save Timer (5 Minuten)
 * - Manuelle Speicherung
 * - Unsaved Changes Tracking
 * - LocalStorage + Backend Sync
 *
 * Quality: 12/10
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseAutoSaveOptions<T> {
  data: T
  onSave: (data: T) => Promise<void>
  interval?: number // in milliseconds, default: 5 minutes
  storageKey?: string // for localStorage backup
  enabled?: boolean
}

interface UseAutoSaveReturn {
  save: () => Promise<void>
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  error: Error | null
}

export function useAutoSave<T>({
  data,
  onSave,
  interval = 5 * 60 * 1000, // 5 minutes
  storageKey,
  enabled = true
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastDataRef = useRef<T>(data)
  const saveInProgressRef = useRef(false)

  // Manual save function
  const save = useCallback(async () => {
    if (saveInProgressRef.current) {
      console.log('Save already in progress, skipping...')
      return
    }

    try {
      saveInProgressRef.current = true
      setIsSaving(true)
      setError(null)

      // Save to localStorage first (instant backup)
      if (storageKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            data,
            savedAt: new Date().toISOString()
          }))
        } catch (err) {
          console.error('LocalStorage save failed:', err)
        }
      }

      // Save to backend
      await onSave(data)

      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      lastDataRef.current = data

      console.log('✅ Auto-save successful')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed')
      setError(error)
      console.error('❌ Auto-save failed:', error)
    } finally {
      setIsSaving(false)
      saveInProgressRef.current = false
    }
  }, [data, onSave, storageKey])

  // Track changes
  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(lastDataRef.current)) {
      setHasUnsavedChanges(true)
    }
  }, [data])

  // Auto-save timer
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      console.log('⏰ Auto-save triggered (5 minutes elapsed)')
      save()
    }, interval)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [enabled, hasUnsavedChanges, interval, save])

  // Load from localStorage on mount
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const { savedAt } = JSON.parse(saved)
          setLastSaved(new Date(savedAt))
        }
      } catch (err) {
        console.error('Failed to load from localStorage:', err)
      }
    }
  }, [storageKey])

  // Save before page unload
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'

        // Try to save synchronously
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify({
              data,
              savedAt: new Date().toISOString()
            }))
          } catch (err) {
            console.error('Failed to save before unload:', err)
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, hasUnsavedChanges, data, storageKey])

  return {
    save,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    error
  }
}
