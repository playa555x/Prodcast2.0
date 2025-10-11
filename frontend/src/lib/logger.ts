/**
 * Production-Safe Logging Utility
 *
 * Prevents sensitive information leaks in production
 * Provides consistent logging interface
 *
 * Quality: 12/10
 * Created: 2025-10-11
 */

// ============================================
// Types
// ============================================

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

interface LoggerConfig {
  isDevelopment: boolean
  enabledLevels: LogLevel[]
}

// ============================================
// Configuration
// ============================================

const config: LoggerConfig = {
  isDevelopment: process.env.NODE_ENV === 'development',
  enabledLevels: ['error', 'warn'] // Always log errors and warnings
}

// In development, enable all log levels
if (config.isDevelopment) {
  config.enabledLevels.push('log', 'info', 'debug')
}

// ============================================
// Logger Class
// ============================================

class Logger {
  private context?: string

  constructor(context?: string) {
    this.context = context
  }

  private formatMessage(...args: any[]): any[] {
    if (this.context) {
      return [`[${this.context}]`, ...args]
    }
    return args
  }

  private shouldLog(level: LogLevel): boolean {
    return config.enabledLevels.includes(level)
  }

  /**
   * Log general information (development only)
   */
  log(...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(...this.formatMessage(...args))
    }
  }

  /**
   * Log informational messages (development only)
   */
  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage(...args))
    }
  }

  /**
   * Log warnings (always enabled)
   */
  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage(...args))
    }
  }

  /**
   * Log errors (always enabled)
   */
  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage(...args))
    }
  }

  /**
   * Log debug information (development only)
   */
  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage(...args))
    }
  }

  /**
   * Create a child logger with a specific context
   */
  withContext(context: string): Logger {
    return new Logger(context)
  }
}

// ============================================
// Exports
// ============================================

/**
 * Default logger instance
 */
export const logger = new Logger()

/**
 * Create a logger with a specific context
 *
 * Usage:
 * const logger = createLogger('API')
 * logger.info('Fetching users...')
 * // Output: [API] Fetching users...
 */
export function createLogger(context: string): Logger {
  return new Logger(context)
}

/**
 * Convenience exports for direct usage
 *
 * Usage:
 * import { log, error, warn } from '@/lib/logger'
 * log('Something happened')
 * error('An error occurred')
 */
export const log = logger.log.bind(logger)
export const info = logger.info.bind(logger)
export const warn = logger.warn.bind(logger)
export const error = logger.error.bind(logger)
export const debug = logger.debug.bind(logger)
