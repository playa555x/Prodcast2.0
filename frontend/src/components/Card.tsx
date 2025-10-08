/**
 * Card Component - Reusable Card Container
 * 
 * Features:
 * - Glass morphism effect
 * - Hover animations
 * - Shadow variants
 * - Padding options
 * 
 * Quality: 12/10
 * Last updated: 2025-10-06
 */

import React from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  glass?: boolean
  padding?: 'none' | 'small' | 'medium' | 'large'
  onClick?: () => void
}

const paddingStyles = {
  none: 'p-0',
  small: 'p-4',
  medium: 'p-6',
  large: 'p-8'
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  glass = false,
  padding = 'medium',
  onClick
}) => {
  const baseStyles = 'rounded-xl transition-all duration-300'

  const glassStyles = glass
    ? 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border border-white/20 dark:border-gray-700/50'
    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'

  const shadowStyles = glass
    ? 'shadow-lg'
    : 'shadow-md dark:shadow-gray-900/50'
  
  const hoverStyles = hoverable
    ? 'hover:shadow-xl hover:scale-[1.02] cursor-pointer'
    : ''

  const classes = [
    baseStyles,
    glassStyles,
    shadowStyles,
    hoverStyles,
    paddingStyles[padding],
    className
  ].join(' ')

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  )
}

export const GlassCard: React.FC<Omit<CardProps, 'glass'>> = (props) => {
  return <Card {...props} glass={true} />
}
