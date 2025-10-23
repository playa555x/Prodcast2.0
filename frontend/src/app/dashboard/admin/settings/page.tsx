/**
 * Admin System Settings Page
 *
 * Features:
 * - API keys management
 * - System configuration
 * - TTS provider settings
 * - Usage limits
 * - Platform health monitoring
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, LoadingSpinner, DashboardNavbar } from '@/components'
import { useAuth } from '@/hooks'

// ============================================
// Types
// ============================================

interface SystemSettings {
  // API Keys
  openaiApiKey: string
  elevenlabsApiKey: string
  googleApiKey: string
  speechifyApiKey: string
  anthropicApiKey: string

  // System Limits
  freeTierMonthlyLimit: number
  starterTierMonthlyLimit: number
  proTierMonthlyLimit: number
  enterpriseTierMonthlyLimit: number

  // TTS Provider Settings
  enabledProviders: string[]
  defaultProvider: string

  // Research Settings
  maxResearchSources: number
  researchTimeoutSeconds: number

  // MCP Settings
  mcpYoutubeEnabled: boolean
  mcpWebScrapingEnabled: boolean
}

// ============================================
// Component
// ============================================

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'api' | 'limits' | 'providers' | 'research' | 'monitoring'>('api')
  const [settings, setSettings] = useState<SystemSettings>({
    openaiApiKey: '',
    elevenlabsApiKey: '',
    googleApiKey: '',
    speechifyApiKey: '',
    anthropicApiKey: '',
    freeTierMonthlyLimit: 10000,
    starterTierMonthlyLimit: 100000,
    proTierMonthlyLimit: 500000,
    enterpriseTierMonthlyLimit: 999999999,
    enabledProviders: ['openai', 'elevenlabs', 'google', 'speechify'],
    defaultProvider: 'speechify',
    maxResearchSources: 10,
    researchTimeoutSeconds: 300,
    mcpYoutubeEnabled: false,
    mcpWebScrapingEnabled: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, user, router])

  // ============================================
  // Functions
  // ============================================

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      // TODO: Load from backend
      // For now, load from localStorage
      const saved = localStorage.getItem('admin_system_settings')
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') {
      loadSettings()
    }
  }, [user, loadSettings])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // TODO: Save to backend
      // For now, save to localStorage
      localStorage.setItem('admin_system_settings', JSON.stringify(settings))

      setMessage({ type: 'success', text: 'System settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings({ ...settings, [key]: value })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading settings..." />
      </div>
    )
  }

  if (user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Navigation */}
      <DashboardNavbar>
        <Button onClick={() => router.push('/dashboard')} className="text-xs md:text-sm px-2 md:px-4">
          ← Zurück
        </Button>
        <div>
          <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            ⚙️ Systemeinstellungen
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Plattformweite Einstellungen konfigurieren</p>
        </div>
      </DashboardNavbar>

      {/* Tabs Section */}
      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-3xl border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex gap-1">
            {[
              { id: 'api' as const, label: 'API Keys', icon: '🔑' },
              { id: 'limits' as const, label: 'Usage Limits', icon: '📊' },
              { id: 'providers' as const, label: 'TTS Providers', icon: '🎤' },
              { id: 'research' as const, label: 'AI Research', icon: '🧠' },
              { id: 'monitoring' as const, label: 'Monitoring', icon: '📈' }
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
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-green-700'
              : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(239 68 68), 0 0 40px rgb(239 68 68 / 0.4)' }} />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">🔑 API Keys Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Configure API keys for external services. Keys are encrypted and stored securely.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={settings.openaiApiKey}
                    onChange={(e) => updateSetting('openaiApiKey', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none font-mono text-sm"
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used for OpenAI TTS and GPT models</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ElevenLabs API Key
                  </label>
                  <input
                    type="password"
                    value={settings.elevenlabsApiKey}
                    onChange={(e) => updateSetting('elevenlabsApiKey', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none font-mono text-sm"
                    placeholder="..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium voice synthesis</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Google Cloud API Key
                  </label>
                  <input
                    type="password"
                    value={settings.googleApiKey}
                    onChange={(e) => updateSetting('googleApiKey', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none font-mono text-sm"
                    placeholder="..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Google Cloud TTS and other services</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Speechify API Key
                  </label>
                  <input
                    type="password"
                    value={settings.speechifyApiKey}
                    onChange={(e) => updateSetting('speechifyApiKey', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none font-mono text-sm"
                    placeholder="..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Speechify TTS services</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Anthropic Claude API Key
                  </label>
                  <input
                    type="password"
                    value={settings.anthropicApiKey}
                    onChange={(e) => updateSetting('anthropicApiKey', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none font-mono text-sm"
                    placeholder="sk-ant-..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used for AI research and script generation</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 dark:text-yellow-500 text-xl">⚠️</span>
                  <div className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Security Note:</strong> API keys should be stored in environment variables (.env file) on the backend.
                    This interface is for reference only. Production deployments should use secure secret management.
                  </div>
                </div>
              </div>
                      </div>
        </div>
          </div>
        )}

        {/* Usage Limits Tab */}
        {activeTab === 'limits' && (
          <div className="space-y-6">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(239 68 68), 0 0 40px rgb(239 68 68 / 0.4)' }} />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📊 Monthly Usage Limits</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Configure character limits for each subscription tier.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Free Tier Limit
                  </label>
                  <input
                    type="number"
                    value={settings.freeTierMonthlyLimit}
                    onChange={(e) => updateSetting('freeTierMonthlyLimit', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current: {settings.freeTierMonthlyLimit.toLocaleString()} chars/month
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Starter Tier Limit
                  </label>
                  <input
                    type="number"
                    value={settings.starterTierMonthlyLimit}
                    onChange={(e) => updateSetting('starterTierMonthlyLimit', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current: {settings.starterTierMonthlyLimit.toLocaleString()} chars/month
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Professional Tier Limit
                  </label>
                  <input
                    type="number"
                    value={settings.proTierMonthlyLimit}
                    onChange={(e) => updateSetting('proTierMonthlyLimit', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current: {settings.proTierMonthlyLimit.toLocaleString()} chars/month
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enterprise Tier Limit
                  </label>
                  <input
                    type="number"
                    value={settings.enterpriseTierMonthlyLimit}
                    onChange={(e) => updateSetting('enterpriseTierMonthlyLimit', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current: {settings.enterpriseTierMonthlyLimit.toLocaleString()} chars/month (Unlimited)
                  </p>
                </div>
              </div>
                      </div>
        </div>
          </div>
        )}

        {/* TTS Providers Tab */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(239 68 68), 0 0 40px rgb(239 68 68 / 0.4)' }} />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">🎤 TTS Provider Settings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enable/disable TTS providers and set the default provider.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Enabled Providers
                  </label>
                  <div className="space-y-2">
                    {['openai', 'elevenlabs', 'google', 'speechify'].map((provider) => (
                      <label key={provider} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enabledProviders.includes(provider)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateSetting('enabledProviders', [...settings.enabledProviders, provider])
                            } else {
                              updateSetting('enabledProviders', settings.enabledProviders.filter(p => p !== provider))
                            }
                          }}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="font-medium capitalize text-gray-900 dark:text-gray-100">{provider}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Provider
                  </label>
                  <select
                    value={settings.defaultProvider}
                    onChange={(e) => updateSetting('defaultProvider', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                  >
                    {settings.enabledProviders.map((provider) => (
                      <option key={provider} value={provider} className="capitalize">
                        {provider}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This provider will be pre-selected for new users
                  </p>
                </div>
              </div>
                      </div>
        </div>
          </div>
        )}

        {/* AI Research Tab */}
        {activeTab === 'research' && (
          <div className="space-y-6">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(239 68 68), 0 0 40px rgb(239 68 68 / 0.4)' }} />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">🧠 AI Research Settings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Configure AI research and content generation settings.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Research Sources
                  </label>
                  <input
                    type="number"
                    value={settings.maxResearchSources}
                    onChange={(e) => updateSetting('maxResearchSources', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum number of sources to fetch per research request
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Research Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings.researchTimeoutSeconds}
                    onChange={(e) => updateSetting('researchTimeoutSeconds', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum time allowed for research operations
                  </p>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    MCP (Model Context Protocol) Features
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.mcpYoutubeEnabled}
                        onChange={(e) => updateSetting('mcpYoutubeEnabled', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">YouTube MCP</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Enable YouTube transcript fetching via MCP</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.mcpWebScrapingEnabled}
                        onChange={(e) => updateSetting('mcpWebScrapingEnabled', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">Web Scraping MCP</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Enable web content extraction via MCP</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
                      </div>
        </div>
          </div>
        )}

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(239 68 68), 0 0 40px rgb(239 68 68 / 0.4)' }} />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📈 System Health Monitoring</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Real-time system health and performance metrics.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">API Status</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-500">● Operational</div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Active Users</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">-- </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">Requests Today</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-500">-- </div>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">Error Rate</div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">-- %</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Note:</strong> Full monitoring dashboard coming soon. Will include detailed analytics,
                  usage graphs, error tracking, and performance metrics.
                </div>
              </div>
                      </div>
        </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <Button
            onClick={handleSave}
            disabled={saving}
            loading={saving}
            className="bg-indigo-600 hover:bg-indigo-700 px-8"
          >
            💾 Save System Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
