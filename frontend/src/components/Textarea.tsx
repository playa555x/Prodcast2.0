/**
 * Textarea Component - Reusable Textarea Field
 * 
 * Features:
 * - Label support
 * - Error state
 * - Character counter
 * - Resize options
 * 
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

import React, { forwardRef } from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helpText?: string
  showCounter?: boolean
  counterMax?: number
  fullWidth?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    label,
    error,
    helpText,
    showCounter = false,
    counterMax,
    fullWidth = true,
    resize = 'vertical',
    className = '',
    value,
    ...props
  }, ref) => {
    const currentLength = typeof value === 'string' ? value.length : 0
    
    const textareaClasses = [
      'px-4 py-2 rounded-lg border-2 transition-all duration-200',
      'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
      'focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400',
      error
        ? 'border-red-500 focus:border-red-500'
        : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400',
      fullWidth ? 'w-full' : '',
      resize === 'none' ? 'resize-none' : '',
      resize === 'vertical' ? 'resize-y' : '',
      resize === 'horizontal' ? 'resize-x' : '',
      resize === 'both' ? 'resize' : '',
      className
    ].join(' ')

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          className={textareaClasses}
          value={value}
          {...props}
        />
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex-1">
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            
            {helpText && !error && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
            )}
          </div>
          
          {showCounter && (
            <p className={`text-sm ml-2 ${
              counterMax && currentLength > counterMax
                ? 'text-red-600 font-semibold'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {currentLength}{counterMax && ` / ${counterMax}`}
            </p>
          )}
        </div>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
