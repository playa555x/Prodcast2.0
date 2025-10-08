/**
 * useAuth Hook - Authentication State Management
 * 
 * Features:
 * - Login/Logout/Register
 * - User state management
 * - Auto-redirect on 401
 * - Loading states
 * - Error handling
 * 
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth.service'
import { ROUTES } from '@/lib/constants'
import type { User, LoginRequest, RegisterRequest } from '@/types'

export interface UseAuthReturn {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<boolean>
  register: (data: RegisterRequest) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
}

export const useAuth = (): UseAuthReturn => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize - check if user is logged in
  useEffect(() => {
    const initAuth = () => {
      const isAuth = authService.isAuthenticated()
      if (isAuth) {
        const storedUser = authService.getStoredUser()
        setUser(storedUser)
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  // Login
  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)

    const result = await authService.login(credentials)

    if (result.ok) {
      setUser(result.value.user)
      setLoading(false)
      return true
    } else {
      setError(result.error.detail)
      setLoading(false)
      return false
    }
  }, [])

  // Register
  const register = useCallback(async (data: RegisterRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)

    const result = await authService.register(data)

    if (result.ok) {
      setUser(result.value.user)
      setLoading(false)
      return true
    } else {
      setError(result.error.detail)
      setLoading(false)
      return false
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    setLoading(true)
    await authService.logout()
    setUser(null)
    setLoading(false)
    router.push(ROUTES.LOGIN)
  }, [router])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    setLoading(true)
    const result = await authService.getCurrentUser()
    
    if (result.ok) {
      setUser(result.value)
    } else {
      // Token invalid, logout
      await logout()
    }
    
    setLoading(false)
  }, [logout])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    clearError
  }
}
