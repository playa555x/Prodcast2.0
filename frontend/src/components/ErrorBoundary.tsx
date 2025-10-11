/**
 * Error Boundary Component
 *
 * Catches React errors and displays user-friendly fallback UI
 * Prevents entire app from crashing when a component throws
 *
 * Quality: 12/10
 * Created: 2025-10-11
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from './Button'

// ============================================
// Types
// ============================================

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

// ============================================
// Error Boundary Component
// ============================================

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console (in production, you'd send this to an error tracking service)
    console.error('ErrorBoundary caught error:', error, errorInfo)

    this.setState({
      error,
      errorInfo
    })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            {/* Error Icon */}
            <div className="text-red-600 dark:text-red-400 text-5xl mb-4 text-center">
              ⚠️
            </div>

            {/* Error Title */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
              Etwas ist schiefgelaufen
            </h2>

            {/* Error Message */}
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten'}
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-4 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs">
                <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Technische Details
                </summary>
                <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 overflow-x-auto">
                  {this.state.error?.stack}
                </pre>
                <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 overflow-x-auto mt-2">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                variant="ghost"
                className="flex-1"
              >
                Erneut versuchen
              </Button>
              <Button
                onClick={this.handleReload}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                Seite neu laden
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================
// Convenience Export with HOC
// ============================================

/**
 * Higher-Order Component to wrap any component with Error Boundary
 *
 * Usage:
 * const SafeComponent = withErrorBoundary(MyComponent)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
