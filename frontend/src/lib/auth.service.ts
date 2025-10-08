/**
 * Auth Service - Authentication API Calls
 * 
 * All authentication-related API interactions
 * Type-safe, error-handled, production-ready
 * 
 * Last updated: 2025-10-06
 */

import { apiClient } from './api-client'
import { API_ENDPOINTS } from './constants'
import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  User,
  Result,
  APIError
} from '@/types'

// ============================================
// Auth Service
// ============================================

export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<Result<LoginResponse, APIError>> {
    const result = await apiClient.postPublic<LoginResponse>(
      API_ENDPOINTS.LOGIN,
      credentials
    )

    // Store token on successful login
    if (result.ok) {
      apiClient.setToken(result.value.access_token)
      // Store user data in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(result.value.user))
      }
    }

    return result
  },

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<Result<LoginResponse, APIError>> {
    const result = await apiClient.postPublic<LoginResponse>(
      API_ENDPOINTS.REGISTER,
      data
    )

    // Store token on successful registration
    if (result.ok) {
      apiClient.setToken(result.value.access_token)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(result.value.user))
      }
    }

    return result
  },

  /**
   * Logout user
   */
  async logout(): Promise<Result<void, APIError>> {
    const result = await apiClient.post<void>(API_ENDPOINTS.LOGOUT, {})
    
    // Clear local data regardless of result
    apiClient.clearToken()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_data')
    }

    return result
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<Result<User, APIError>> {
    return apiClient.get<User>(API_ENDPOINTS.ME)
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    const token = localStorage.getItem('auth_token')
    return !!token
  },

  /**
   * Get stored user data (from localStorage)
   */
  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null
    const userData = localStorage.getItem('user_data')
    if (!userData) return null
    
    try {
      return JSON.parse(userData) as User
    } catch {
      return null
    }
  }
}
