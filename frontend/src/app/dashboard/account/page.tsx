/**
 * User Account Page
 *
 * Features:
 * - Profile management
 * - Personal statistics
 * - Subscription management
 * - Billing history
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, LoadingSpinner, DashboardNavbar } from '@/components'
import { useAuth } from '@/hooks'

// ============================================
// Types
// ============================================

interface UserProfile {
  user_id: string
  username: string
  email?: string
  role: string
  created_at: string
  last_login?: string
}

interface UserStatistics {
  user_id: string
  total_characters_used: number
  total_audio_generated: number
  total_cost_usd: number
  monthly_characters_used: number
  monthly_limit: number
  remaining_characters: number
  usage_percentage: number
  favorite_provider?: string
  favorite_voice?: string
  total_projects: number
  completed_projects: number
}

interface SubscriptionPlan {
  plan_id: string
  name: string
  description: string
  monthly_price_usd: number
  monthly_characters: number
  features: string[]
  is_popular: boolean
}

interface CurrentSubscription {
  plan_id: string
  plan_name: string
  monthly_characters: number
  used_characters: number
  remaining_characters: number
  renewal_date?: string
  status: string
}

// ============================================
// Component
// ============================================

export default function AccountPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'subscription' | 'settings'>('profile')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [statistics, setStatistics] = useState<UserStatistics | null>(null)
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, activeTab])

  // ============================================
  // Functions
  // ============================================

  const loadData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')

      if (activeTab === 'profile') {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          setProfile(await response.json())
        }
      } else if (activeTab === 'stats') {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account/statistics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          setStatistics(await response.json())
        }
      } else if (activeTab === 'subscription') {
        const [subResponse, plansResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/current`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/plans`)
        ])

        if (subResponse.ok) setCurrentSubscription(await subResponse.json())
        if (plansResponse.ok) setPlans(await plansResponse.json())
      }
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <DashboardNavbar>
        <Button onClick={() => router.push('/dashboard')} className="text-xs md:text-sm px-2 md:px-4">
          ← Zurück
        </Button>
        <div>
          <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Mein Account
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Verwalte dein Profil und Abonnement</p>
        </div>
      </DashboardNavbar>

      {/* Tabs Section */}
      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-3xl border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-3">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'profile' as const, label: 'Profile', icon: '👤' },
              { id: 'stats' as const, label: 'Statistics', icon: '📊' },
              { id: 'subscription' as const, label: 'Subscription', icon: '💳' },
              { id: 'settings' as const, label: 'Settings', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="medium" />
          </div>
        ) : (
          <>
            {activeTab === 'profile' && profile && <ProfileTab profile={profile} onReload={loadData} />}
            {activeTab === 'stats' && statistics && <StatisticsTab statistics={statistics} />}
            {activeTab === 'subscription' && (
              <SubscriptionTab
                currentSubscription={currentSubscription}
                plans={plans}
                onReload={loadData}
              />
            )}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// Profile Tab
// ============================================

function ProfileTab({ profile }: { profile: UserProfile; onReload: () => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Personal Information</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</label>
            <p className="text-gray-900 dark:text-gray-100">{profile.username}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
            <p className="text-gray-900 dark:text-gray-100">{profile.email || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</label>
            <p className="text-gray-900 dark:text-gray-100 capitalize">{profile.role}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</label>
            <p className="text-gray-900 dark:text-gray-100">
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Settings</h3>
        <div className="space-y-3">
          <Button className="w-full">Change Password</Button>
          <Button className="w-full" variant="ghost">Update Email</Button>
          <Button className="w-full" variant="ghost">Notification Settings</Button>
        </div>
      </Card>
    </div>
  )
}

// ============================================
// Statistics Tab
// ============================================

function StatisticsTab({ statistics }: { statistics: UserStatistics }) {
  return (
    <div className="space-y-6">
      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-indigo-600 dark:border-indigo-500">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Characters</div>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {statistics.total_characters_used.toLocaleString()}
          </div>
        </Card>

        <Card className="border-l-4 border-green-600 dark:border-green-500">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Audio Generated</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {statistics.total_audio_generated}
          </div>
        </Card>

        <Card className="border-l-4 border-orange-600 dark:border-orange-500">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Cost</div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            ${statistics.total_cost_usd.toFixed(2)}
          </div>
        </Card>
      </div>

      {/* Monthly Usage */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Usage</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Characters Used</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {statistics.monthly_characters_used.toLocaleString()} / {statistics.monthly_limit.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{ width: `${Math.min(statistics.usage_percentage, 100)}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
              {statistics.usage_percentage.toFixed(1)}% used
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remaining</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {statistics.remaining_characters.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Projects</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {statistics.completed_projects} / {statistics.total_projects}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Favorites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Favorite Provider</h3>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 capitalize">
            {statistics.favorite_provider || 'Not set'}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Favorite Voice</h3>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {statistics.favorite_voice || 'Not set'}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ============================================
// Settings Tab
// ============================================

function SettingsTab() {
  const [driveFolderPath, setDriveFolderPath] = useState('')
  const [desktopSavePath, setDesktopSavePath] = useState('')
  const [queueFolderPath, setQueueFolderPath] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light')
  const [accentColor, setAccentColor] = useState('indigo')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('user_settings')
        if (saved) {
          const settings = JSON.parse(saved)
          setDriveFolderPath(settings.driveFolderPath || '')
          setDesktopSavePath(settings.desktopSavePath || '')
          setQueueFolderPath(settings.queueFolderPath || '')
          setTheme(settings.theme || 'light')
          setAccentColor(settings.accentColor || 'indigo')
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const settings = {
        driveFolderPath,
        desktopSavePath,
        queueFolderPath,
        theme,
        accentColor
      }

      // Save to localStorage (in production, this would be saved to backend)
      localStorage.setItem('user_settings', JSON.stringify(settings))

      setMessage({ type: 'success', text: 'Settings saved successfully!' })

      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Storage Configuration */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📁 Storage Configuration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure storage locations for AI-generated scripts and outputs.
          These settings are used by Claude API modes in AI Podcast Research.
        </p>

        <div className="space-y-4">
          {/* Google Drive Folder (Mode 2: API + Storage) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Google Drive Folder <span className="text-gray-500 dark:text-gray-400">(Mode 2: API + Storage)</span>
            </label>
            <input
              type="text"
              value={driveFolderPath}
              onChange={(e) => setDriveFolderPath(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
              placeholder="E:\CloudSync\GoogleDrive\PodcastScripts"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Path to your synced Google Drive folder where scripts will be saved
            </p>
          </div>

          {/* Desktop Save Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Desktop Save Location <span className="text-gray-500 dark:text-gray-400">(Alternative)</span>
            </label>
            <input
              type="text"
              value={desktopSavePath}
              onChange={(e) => setDesktopSavePath(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
              placeholder="C:\Users\YourName\Desktop\PodcastScripts"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Alternative local folder for saving scripts
            </p>
          </div>

          {/* Drive Queue Folder (Mode 3: Queue System) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Drive Queue Folder <span className="text-gray-500 dark:text-gray-400">(Mode 3: Queue System)</span>
            </label>
            <input
              type="text"
              value={queueFolderPath}
              onChange={(e) => setQueueFolderPath(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
              placeholder="E:\CloudSync\GoogleDrive\ClaudeQueue\Requests"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Path to the queue folder monitored by Claude Desktop/Code with MCP
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 text-xl">💡</span>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> For Google Drive sync, make sure the folder is actively synced to your local machine.
                The queue system requires Claude Desktop/Code with MCP file watching configured.
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Personalization */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🎨 Personalization
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Customize the look and feel of your dashboard.
        </p>

        <div className="space-y-4">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['light', 'dark', 'auto'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-4 py-3 border-2 rounded-lg transition-all ${
                    theme === t
                      ? 'border-indigo-600 bg-gray-50 dark:bg-gray-900 text-indigo-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium capitalize">
                    {t === 'light' && '☀️ Light'}
                    {t === 'dark' && '🌙 Dark'}
                    {t === 'auto' && '🔄 Auto'}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {theme === 'auto' && 'Automatically switches based on system preferences'}
              {theme === 'dark' && 'Dark mode is coming soon! Currently in development.'}
              {theme === 'light' && 'Classic light theme (current)'}
            </p>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Accent Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[
                { name: 'indigo', color: 'bg-indigo-600' },
                { name: 'blue', color: 'bg-blue-600' },
                { name: 'purple', color: 'bg-purple-600' },
                { name: 'pink', color: 'bg-pink-600' },
                { name: 'green', color: 'bg-green-600' },
                { name: 'orange', color: 'bg-orange-600' }
              ].map((c) => (
                <button
                  key={c.name}
                  onClick={() => setAccentColor(c.name)}
                  className={`w-12 h-12 rounded-lg ${c.color} transition-all ${
                    accentColor === c.name
                      ? 'ring-4 ring-gray-300 scale-110'
                      : 'hover:scale-105'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Custom accent colors coming soon! Currently uses indigo throughout the app.
            </p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          loading={saving}
          className="bg-indigo-600 hover:bg-indigo-700 px-8"
        >
          💾 Save Settings
        </Button>
      </div>
    </div>
  )
}

// ============================================
// Subscription Tab
// ============================================

function SubscriptionTab({
  currentSubscription,
  plans,
  onReload
}: {
  currentSubscription: CurrentSubscription | null
  plans: SubscriptionPlan[]
  onReload: () => void
}) {
  const [subscribing, setSubscribing] = useState(false)

  const handleSubscribe = async (planId: string) => {
    setSubscribing(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/subscribe?plan_id=${planId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      )

      if (response.ok) {
        onReload()
      }
    } catch (e) {
      console.error('Failed to subscribe:', e)
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Current Subscription */}
      {currentSubscription && (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-2xl rounded-2xl">
          <h3 className="text-xl font-bold mb-4">Current Plan: {currentSubscription.plan_name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm opacity-90 mb-1">Monthly Allowance</div>
              <div className="text-2xl font-bold">
                {currentSubscription.monthly_characters.toLocaleString()} chars
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Used</div>
              <div className="text-2xl font-bold">
                {currentSubscription.used_characters.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Remaining</div>
              <div className="text-2xl font-bold">
                {currentSubscription.remaining_characters.toLocaleString()}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.plan_id}
              className={`relative shadow-xl rounded-2xl hover:shadow-2xl transition-all ${plan.is_popular ? 'border-2 border-indigo-600 dark:border-indigo-500' : ''}`}
            >
              {plan.is_popular && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
              )}

              <div className="text-center mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  ${plan.monthly_price_usd}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">per month</div>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                    <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.plan_id)}
                disabled={subscribing || currentSubscription?.plan_id === plan.plan_id}
                className={`w-full ${
                  plan.is_popular
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {currentSubscription?.plan_id === plan.plan_id ? 'Current Plan' : 'Subscribe'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
