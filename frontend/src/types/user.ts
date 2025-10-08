/**
 * User Types - Synced with Backend Models
 * Backend: models/user.py
 * 
 * CRITICAL: These types MUST match Backend DTOs exactly!
 * Last synced: 2025-10-06
 */

// ============================================
// Enums (matching Backend)
// ============================================

export enum UserRole {
  ADMIN = 'admin',
  PAID = 'paid',
  FREE = 'free'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// ============================================
// User Types (matching Backend DTOs)
// ============================================

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string // ISO datetime
  lastLogin: string | null // ISO datetime or null
}

export interface UserStats {
  userId: string
  totalCharactersUsed: number
  totalAudioGenerated: number
  totalCostUsd: number
  monthlyCharactersUsed: number
  monthlyLimit: number
  remainingCharacters: number
  totalDurationMinutes?: number
  trendingTopicsCount?: number
  firstPodcastDate?: string
  lastPodcastDate?: string
  averageDuration?: number
  longestDuration?: number
  shortestDuration?: number
  averageCharacters?: number
  maxCharacters?: number
  minCharacters?: number
}

// ============================================
// Request Types
// ============================================

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface UserUpdateRequest {
  email?: string
  role?: UserRole
  status?: UserStatus
}

// ============================================
// Response Types
// ============================================

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface AuthError {
  detail: string
}

// ============================================
// Type Guards
// ============================================

export const isUser = (obj: any): obj is User => {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.email === 'string' &&
    Object.values(UserRole).includes(obj.role) &&
    Object.values(UserStatus).includes(obj.status)
  )
}

export const isUserStats = (obj: any): obj is UserStats => {
  return (
    typeof obj === 'object' &&
    typeof obj.userId === 'string' &&
    typeof obj.totalCharactersUsed === 'number' &&
    typeof obj.monthlyLimit === 'number'
  )
}
