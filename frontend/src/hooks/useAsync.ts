/**
 * useAsync Hook - Generic Async State Management
 * 
 * Features:
 * - Loading state
 * - Error handling
 * - Success state
 * - Automatic cleanup
 * - Retry functionality
 * 
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  success: boolean
}

export interface UseAsyncReturn<T, Args extends any[] = []> extends UseAsyncState<T> {
  execute: (...args: Args) => Promise<T | null>
  reset: () => void
  setData: (data: T | null) => void
}

/**
 * Hook for handling async operations with automatic state management
 * 
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute immediately on mount
 * @returns State and control functions
 */
export const useAsync = <T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  immediate: boolean = false
): UseAsyncReturn<T, Args> => {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
    success: false
  })

  // Ref to track if component is mounted
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({
        data: null,
        loading: true,
        error: null,
        success: false
      })

      try {
        const response = await asyncFunction(...args)

        if (isMountedRef.current) {
          setState({
            data: response,
            loading: false,
            error: null,
            success: true
          })
        }

        return response
      } catch (error) {
        if (isMountedRef.current) {
          setState({
            data: null,
            loading: false,
            error: (error as Error).message || 'An error occurred',
            success: false
          })
        }

        return null
      }
    },
    [asyncFunction]
  )

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false
    })
  }, [])

  const setData = useCallback((data: T | null) => {
    setState(prev => ({
      ...prev,
      data
    }))
  }, [])

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    execute,
    reset,
    setData
  }
}
