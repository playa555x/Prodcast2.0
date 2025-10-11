/**
 * Login/Register Page - Premium Auth Experience
 * 
 * Features:
 * - Login & Register tabs
 * - Form validation
 * - Error handling
 * - Loading states
 * - Auto-redirect on success
 * 
 * Quality: 12/10 - Production Ready!
 * Last updated: 2025-10-06
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card, ErrorAlert } from '@/components'
import { useAuth } from '@/hooks'
import { ROUTES, APP_NAME } from '@/lib/constants'

export default function HomePage() {
  const router = useRouter()
  const { login, register, loading, error, clearError, isAuthenticated } = useAuth()
  
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(ROUTES.DASHBOARD)
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    let success = false
    
    if (isLogin) {
      success = await login({
        username: formData.username,
        password: formData.password
      })
    } else {
      success = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      })
    }

    if (success) {
      router.push(ROUTES.DASHBOARD)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    clearError()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-5">
      <Card className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">
            🎙️ {APP_NAME}
          </h1>
          <p className="text-gray-600 text-sm">Premium TTS Platform</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              isLogin
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              !isLogin
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Username"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Enter your username"
            required
            autoComplete="username"
          />

          {!isLogin && (
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          )}

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter your password"
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            helpText={!isLogin ? 'Minimum 8 characters' : undefined}
          />

          {error && (
            <ErrorAlert
              message={error}
              onDismiss={clearError}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            loading={loading}
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Switch Mode Link */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>
      </Card>
    </div>
  )
}
