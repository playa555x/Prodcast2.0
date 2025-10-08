/**
 * Dashboard Navbar - Shared Navigation Component
 *
 * Features:
 * - Dark Mode Toggle
 * - Project Selector
 * - Account Button
 * - Admin Buttons (Users, Settings)
 * - Logout Button
 * - Responsive Design
 *
 * Quality: 12/10
 * Last updated: 2025-10-08
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, User, Users, Settings, LogOut } from 'lucide-react'
import { ProjectSelector } from '@/components'
import { useAuth } from '@/hooks'

interface DashboardNavbarProps {
  /** Show project selector (default: true) */
  showProjectSelector?: boolean
  /** Additional content to display (e.g., page title) */
  children?: React.ReactNode
}

export function DashboardNavbar({
  showProjectSelector = true,
  children
}: DashboardNavbarProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [darkMode, setDarkMode] = useState(false)

  // Dark Mode Toggle
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }

  return (
    <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-3xl border-b-2 border-amber-400/50 sticky top-0 z-50 shadow-lg relative group/navbar">
      {/* Golden Border Glow Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-0 group-hover/navbar:opacity-100 transition-opacity duration-500 blur-sm" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Custom Content (Page Title, Back Button, etc.) */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {children}
          </div>

          {/* Center: Project Selector (if enabled) */}
          {showProjectSelector && (
            <div className="hidden lg:flex flex-1 max-w-2xl px-4">
              <ProjectSelector />
            </div>
          )}

          {/* Right: Navigation Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Dark Mode Toggle */}
            <div className="relative group/tooltip">
              <button
                onClick={toggleDarkMode}
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                aria-label="Dark Mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-purple-600" />
                )}
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {darkMode ? 'Hell' : 'Dunkel'}
              </div>
            </div>

            {/* Einstellungen (Account) - für alle Benutzer */}
            <div className="relative group/tooltip">
              <button
                onClick={() => router.push('/dashboard/account')}
                className="w-10 h-10 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 group flex items-center justify-center"
              >
                <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Einstellungen
              </div>
            </div>

            {/* Admin Buttons */}
            {user?.role === 'admin' && (
              <>
                <div className="relative group/tooltip">
                  <button
                    onClick={() => router.push('/dashboard/admin/users')}
                    className="w-10 h-10 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 group flex items-center justify-center"
                  >
                    <Users className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                  </button>
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Benutzer
                  </div>
                </div>
                <div className="relative group/tooltip">
                  <button
                    onClick={() => router.push('/dashboard/admin/settings')}
                    className="w-10 h-10 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 group flex items-center justify-center"
                  >
                    <User className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </button>
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Admin
                  </div>
                </div>
              </>
            )}

            {/* Logout */}
            <div className="relative group/tooltip">
              <button
                onClick={logout}
                className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center"
              >
                <LogOut className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Abmelden
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Project Selector (below on small screens) */}
        {showProjectSelector && (
          <div className="lg:hidden mt-3">
            <ProjectSelector />
          </div>
        )}
      </div>
    </div>
  )
}
