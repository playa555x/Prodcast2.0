/**
 * Unified TTS Generator Page - Single & Multi-Speaker
 *
 * Features:
 * - Dynamic speaker management (1 or more speakers)
 * - Tri-modal Claude Script Generation:
 *   1. Pure API (standard request/response)
 *   2. API + Storage (save to Desktop/Drive, return link)
 *   3. Drive-based Queue (file watcher + Claude Desktop/Code + MCP)
 * - XML Script Parser for <SPEAKER> tags
 * - Multi-provider support
 * - Voice selection with filters
 * - Individual settings per speaker
 * - Batch generation
 *
 * Quality: 12/10
 * Last updated: 2025-10-07
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Textarea, ErrorAlert, SuccessAlert, VoiceSelector, DashboardNavbar } from '@/components'
import { ttsService } from '@/lib/tts.service'
import { claudeScriptService } from '@/lib/claude-script.service'
import { TTSProvider, VoiceInfo } from '@/types'
import { MAX_TEXT_LENGTH, API_URL, API_ENDPOINTS } from '@/lib/constants'
import { useTTSProvider } from '@/contexts/TTSProviderContext'

// ============================================
// Types
// ============================================

interface Speaker {
  id: string
  name: string
  text: string
  provider: TTSProvider
  voice: string
  speed: number
  pitch?: number
  audioUrl?: string
  generating: boolean
}

type GenerationMode = 'pure_api' | 'api_storage' | 'drive_queue'

interface GenerationModeConfig {
  id: GenerationMode
  name: string
  description: string
  icon: string
  costLevel: 'high' | 'medium' | 'low'
}

// ============================================
// Generation Mode Configurations
// ============================================

const GENERATION_MODES: GenerationModeConfig[] = [
  {
    id: 'pure_api',
    name: 'Pure API',
    description: 'Standard API request/response. Claude returns script directly. Higher token costs but simplest.',
    icon: '⚡',
    costLevel: 'high'
  },
  {
    id: 'api_storage',
    name: 'API + Storage',
    description: 'API call to Claude, save response to Desktop/Google Drive. Returns only link/path to save response tokens.',
    icon: '💾',
    costLevel: 'medium'
  },
  {
    id: 'drive_queue',
    name: 'Drive-based Queue',
    description: 'Request saved to Google Drive → Python watcher detects → Triggers Claude Desktop/Code → Saves result via MCP. Minimal API costs.',
    icon: '🔄',
    costLevel: 'low'
  }
]

// ============================================
// Main Component
// ============================================

export default function UnifiedTTSPage() {
  const router = useRouter()

  // TTS Provider Context
  const { providers, availableProviders, loading: providersLoading, error: providerError } = useTTSProvider()

  // Generation Mode State
  const [generationMode, setGenerationMode] = useState<GenerationMode>('pure_api')
  const [showModeSelector, _setShowModeSelector] = useState(false)

  // Speakers State
  const [speakers, setSpeakers] = useState<Speaker[]>([
    {
      id: '1',
      name: 'Speaker 1',
      text: '',
      provider: TTSProvider.OPENAI,
      voice: 'alloy',
      speed: 1.0,
      generating: false
    }
  ])

  // Claude Script Input
  const [claudeScript, setClaudeScript] = useState('')
  const [showClaudeInput, setShowClaudeInput] = useState(false)
  const [parsingClaudeScript, setParsingClaudeScript] = useState(false)

  // Prompt Generation
  const [promptInput, _setPromptInput] = useState('')
  const [_promptSpeakerCount, _setPromptSpeakerCount] = useState(2)
  const [_promptStyle, _setPromptStyle] = useState<'conversational' | 'formal' | 'casual' | 'interview'>('conversational')
  const [_generatingPrompt, _setGeneratingPrompt] = useState(false)

  // File Upload
  const [uploadingFile, setUploadingFile] = useState(false)

  // Voice Loading
  const [availableVoices, setAvailableVoices] = useState<Record<string, VoiceInfo[]>>({})
  const [loadingVoices, setLoadingVoices] = useState(false)

  // Voice Selection Tab System
  const [selectedProviderTab, setSelectedProviderTab] = useState<TTSProvider | 'FAVORITES'>(TTSProvider.MICROSOFT)
  const [genderFilter, setGenderFilter] = useState<string>('')
  const [filteredVoices, setFilteredVoices] = useState<VoiceInfo[]>([])
  const [showVoiceSelection, setShowVoiceSelection] = useState(true)

  // Favorites System
  const [favoriteVoiceIds, setFavoriteVoiceIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Dynamic filter options (extracted from ALL loaded voices, not filtered)
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([])
  const [availableGenders, setAvailableGenders] = useState<string[]>([])
  const [allVoicesForProvider, setAllVoicesForProvider] = useState<VoiceInfo[]>([])

  // Language filter with dynamic default based on provider
  const getDefaultLanguageForProvider = (provider: TTSProvider): string => {
    // ElevenLabs and OpenAI: All languages (they have many English voices)
    if (provider === TTSProvider.ELEVENLABS || provider === TTSProvider.OPENAI) {
      return ''
    }
    // Microsoft, Google, Speechify: German as default (German product)
    return 'de'
  }

  const [languageFilter, setLanguageFilter] = useState<string>(getDefaultLanguageForProvider(TTSProvider.MICROSOFT))

  // Helper: Convert language code to readable name
  const getLanguageName = (code: string): string => {
    const lowerCode = code.toLowerCase()
    const names: Record<string, string> = {
      'ar': 'Arabic',
      'bg': 'Bulgarian',
      'cs': 'Czech',
      'da': 'Danish',
      'de': 'German',
      'el': 'Greek',
      'en': 'English',
      'es': 'Spanish',
      'et': 'Estonian',
      'fi': 'Finnish',
      'fil': 'Filipino',
      'fr': 'French',
      'he': 'Hebrew',
      'hi': 'Hindi',
      'hr': 'Croatian',
      'hu': 'Hungarian',
      'id': 'Indonesian',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'lt': 'Lithuanian',
      'lv': 'Latvian',
      'ms': 'Malay',
      'nl': 'Dutch',
      'no': 'Norwegian',
      'pl': 'Polish',
      'pt': 'Portuguese',
      'ro': 'Romanian',
      'ru': 'Russian',
      'sk': 'Slovak',
      'sl': 'Slovenian',
      'sv': 'Swedish',
      'ta': 'Tamil',
      'th': 'Thai',
      'tr': 'Turkish',
      'uk': 'Ukrainian',
      'vi': 'Vietnamese',
      'zh': 'Chinese',
      'zh-cn': 'Chinese (Simplified)',
      'zh-tw': 'Chinese (Traditional)',
      'en-us': 'English (US)',
      'en-gb': 'English (UK)',
      'pt-br': 'Portuguese (Brazil)',
      'es-es': 'Spanish (Spain)',
      'es-mx': 'Spanish (Mexico)',
      'fr-fr': 'French (France)',
      'fr-ca': 'French (Canada)',
      'de-de': 'German (Germany)',
    }
    const languageCode = lowerCode.split('-')[0]
    return names[lowerCode] || (languageCode ? names[languageCode] : undefined) || code.toUpperCase()
  }

  // Helper: Get language flag
  const getLanguageFlag = (code: string): string => {
    const lowerCode = code.toLowerCase()
    const flags: Record<string, string> = {
      // Common languages
      'ar': '🇸🇦',      // Arabic
      'bg': '🇧🇬',      // Bulgarian
      'cs': '🇨🇿',      // Czech
      'da': '🇩🇰',      // Danish
      'de': '🇩🇪',      // German
      'el': '🇬🇷',      // Greek
      'en': '🇺🇸',      // English
      'es': '🇪🇸',      // Spanish
      'et': '🇪🇪',      // Estonian
      'fi': '🇫🇮',      // Finnish
      'fil': '🇵🇭',    // Filipino
      'fr': '🇫🇷',      // French
      'he': '🇮🇱',      // Hebrew
      'hi': '🇮🇳',      // Hindi
      'hr': '🇭🇷',      // Croatian
      'hu': '🇭🇺',      // Hungarian
      'id': '🇮🇩',      // Indonesian
      'it': '🇮🇹',      // Italian
      'ja': '🇯🇵',      // Japanese
      'ko': '🇰🇷',      // Korean
      'lt': '🇱🇹',      // Lithuanian
      'lv': '🇱🇻',      // Latvian
      'ms': '🇲🇾',      // Malay
      'nl': '🇳🇱',      // Dutch
      'no': '🇳🇴',      // Norwegian
      'pl': '🇵🇱',      // Polish
      'pt': '🇵🇹',      // Portuguese
      'ro': '🇷🇴',      // Romanian
      'ru': '🇷🇺',      // Russian
      'sk': '🇸🇰',      // Slovak
      'sl': '🇸🇮',      // Slovenian
      'sv': '🇸🇪',      // Swedish
      'ta': '🇮🇳',      // Tamil
      'th': '🇹🇭',      // Thai
      'tr': '🇹🇷',      // Turkish
      'uk': '🇺🇦',      // Ukrainian
      'vi': '🇻🇳',      // Vietnamese
      'zh': '🇨🇳',      // Chinese
      'zh-cn': '🇨🇳',  // Chinese (Simplified)
      'zh-tw': '🇹🇼',  // Chinese (Traditional)
      'en-us': '🇺🇸',  // English (US)
      'en-gb': '🇬🇧',  // English (GB)
      'pt-br': '🇧🇷',  // Portuguese (Brazil)
      'es-es': '🇪🇸',  // Spanish (Spain)
      'es-mx': '🇲🇽',  // Spanish (Mexico)
      'fr-fr': '🇫🇷',  // French (France)
      'fr-ca': '🇨🇦',  // French (Canada)
      'de-de': '🇩🇪',  // German (Germany)
    }
    const languageCode = lowerCode.split('-')[0]
    return flags[lowerCode] || (languageCode ? flags[languageCode] : undefined) || '🌐'
  }

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('tts_favorite_voices')
    if (savedFavorites) {
      try {
        setFavoriteVoiceIds(JSON.parse(savedFavorites))
      } catch (err) {
        console.error('Failed to load favorites:', err)
      }
    }
  }, [])

  // Toggle favorite
  const toggleFavorite = (voiceId: string) => {
    setFavoriteVoiceIds(prev => {
      const newFavorites = prev.includes(voiceId)
        ? prev.filter(id => id !== voiceId)
        : [...prev, voiceId]
      localStorage.setItem('tts_favorite_voices', JSON.stringify(newFavorites))
      return newFavorites
    })
  }

  // Handle provider tab change with proper filter reset
  const handleProviderTabChange = (provider: TTSProvider | 'FAVORITES') => {
    if (provider !== 'FAVORITES') {
      const newLanguageFilter = getDefaultLanguageForProvider(provider)
      setLanguageFilter(newLanguageFilter)
    }
    setSelectedProviderTab(provider)
  }

  // Messages
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ============================================
  // Load Voices - Use voices from provider context
  // ============================================

  useEffect(() => {
    // Wait for providers to load
    if (providersLoading) {
      return
    }

    console.log('🔍 Loading voices from provider context')
    setLoadingVoices(true)
    const voices: Record<string, VoiceInfo[]> = {}

    // Get voices directly from the context (already loaded)
    for (const providerInfo of providers) {
      voices[providerInfo.provider] = providerInfo.voices || []
      console.log(`✅ Loaded ${providerInfo.voices?.length || 0} voices for ${providerInfo.provider}`)
    }

    setAvailableVoices(voices)
    setLoadingVoices(false)
    console.log('✅ All voices loaded from context:', Object.keys(voices))
  }, [providers, providersLoading])

  // ============================================
  // Auto-filter voices when tab or filters change
  // ============================================

  // Load ALL voices when provider changes (for filter options)
  useEffect(() => {
    if (providersLoading || selectedProviderTab === 'FAVORITES') return

    const fetchAllVoicesForProvider = async () => {
      try {
        console.log(`🔍 Fetching ALL voices for ${selectedProviderTab} (no filters)`)

        // Fetch all voices without filters to get available options
        const apiUrl = `${API_URL}${API_ENDPOINTS.TTS_VOICES(selectedProviderTab)}`
        const response = await fetch(apiUrl)

        if (!response.ok) {
          console.error('❌ Failed to fetch all voices')
          setAllVoicesForProvider([])
          return
        }

        const voices: VoiceInfo[] = await response.json()
        console.log(`✅ Loaded ${voices.length} total voices for ${selectedProviderTab}`)

        setAllVoicesForProvider(voices)
      } catch (err) {
        console.error('Error fetching all voices:', err)
        setAllVoicesForProvider([])
      }
    }

    fetchAllVoicesForProvider()
  }, [selectedProviderTab, providersLoading])

  // Extract filter options from ALL voices
  useEffect(() => {
    if (allVoicesForProvider.length === 0) {
      setAvailableLanguages([])
      setAvailableGenders([])
      return
    }

    // Extract unique languages
    const languages = new Set<string>()
    allVoicesForProvider.forEach(voice => {
      if (voice.language) {
        languages.add(voice.language.toLowerCase())
      }
    })

    // Extract unique genders
    const genders = new Set<string>()
    allVoicesForProvider.forEach(voice => {
      if (voice.gender) {
        genders.add(voice.gender.toLowerCase())
      }
    })

    setAvailableLanguages(Array.from(languages).sort())
    setAvailableGenders(Array.from(genders).sort())

    console.log(`📊 Extracted ${languages.size} languages and ${genders.size} genders from ${allVoicesForProvider.length} voices`)
  }, [allVoicesForProvider])

  // Apply filters to show filtered voices (including favorites and search)
  useEffect(() => {
    if (providersLoading) return

    const fetchVoicesDynamic = async () => {
      setLoadingVoices(true)
      try {
        // Handle FAVORITES tab
        if (selectedProviderTab === 'FAVORITES') {
          console.log(`⭐ Fetching favorite voices`)

          // Get all voices from all providers
          const allVoices: VoiceInfo[] = []
          for (const provider of availableProviders) {
            const apiUrl = `${API_URL}${API_ENDPOINTS.TTS_VOICES(provider)}`
            const response = await fetch(apiUrl)
            if (response.ok) {
              const voices: VoiceInfo[] = await response.json()
              allVoices.push(...voices)
            }
          }

          // Filter to only show favorites
          let favorites = allVoices.filter(v => favoriteVoiceIds.includes(v.id))

          // Apply search if active
          if (searchQuery.trim()) {
            favorites = favorites.filter(v =>
              v.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
          }

          console.log(`✅ Found ${favorites.length} favorite voices`)
          setFilteredVoices(favorites)
          setLoadingVoices(false)
          return
        }

        // Handle regular provider tabs
        console.log(`🔍 Fetching voices for ${selectedProviderTab} with filters`)
        console.log(`📊 Language filter: "${languageFilter}", Gender filter: "${genderFilter}", Search: "${searchQuery}"`)

        // Build query parameters
        const params = new URLSearchParams()
        if (languageFilter) params.append('language', languageFilter)
        if (genderFilter) params.append('gender', genderFilter)

        // Call API to get filtered voices
        const apiUrl = `${API_URL}${API_ENDPOINTS.TTS_VOICES(selectedProviderTab)}?${params}`
        console.log(`🌐 API URL: ${apiUrl}`)
        const response = await fetch(apiUrl)

        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ Failed to fetch voices:', errorData)
          setFilteredVoices([])
          return
        }

        let voices: VoiceInfo[] = await response.json()

        // Apply search filter if active
        if (searchQuery.trim()) {
          voices = voices.filter(v =>
            v.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }

        console.log(`✅ Fetched ${voices.length} filtered voices from API`)
        setFilteredVoices(voices)
      } catch (err) {
        console.error('Error fetching voices:', err)
        setFilteredVoices([])
      } finally {
        setLoadingVoices(false)
      }
    }

    // Fetch voices dynamically whenever provider, filters, or search changes
    fetchVoicesDynamic()
  }, [selectedProviderTab, languageFilter, genderFilter, searchQuery, favoriteVoiceIds, availableProviders, providersLoading])


  // ============================================
  // Speaker Management
  // ============================================

  const addSpeaker = () => {
    const newSpeaker: Speaker = {
      id: `${Date.now()}`,
      name: `Speaker ${speakers.length + 1}`,
      text: '',
      provider: TTSProvider.OPENAI,
      voice: 'alloy',
      speed: 1.0,
      generating: false
    }
    setSpeakers([...speakers, newSpeaker])
    setSuccess(`✅ ${newSpeaker.name} added`)
  }

  const removeSpeaker = (id: string) => {
    if (speakers.length === 1) {
      setError('At least one speaker required')
      return
    }
    setSpeakers(speakers.filter(s => s.id !== id))
    setSuccess('✅ Speaker removed')
  }

  const updateSpeaker = (id: string, updates: Partial<Speaker>) => {
    setSpeakers(speakers.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const getVoicesForProvider = (provider: TTSProvider): VoiceInfo[] => {
    return availableVoices[provider] || []
  }

  // ============================================
  // XML Script Parser
  // ============================================

  const parseXMLScript = (script: string): Speaker[] => {
    const speakerRegex = /<SPEAKER\s+name="([^"]+)"\s+voice_type="([^"]+)">([\s\S]*?)<\/SPEAKER>/gi
    const matches = [...script.matchAll(speakerRegex)]

    if (matches.length === 0) {
      throw new Error('No <SPEAKER> tags found in script. Expected format: <SPEAKER name="..." voice_type="...">text</SPEAKER>')
    }

    const parsedSpeakers: Speaker[] = []

    matches.forEach((match, index) => {
      const [_, name, voiceType, text] = match

      // Map voice_type to provider and voice
      let provider = TTSProvider.OPENAI
      let voice = 'alloy'

      // Simple mapping (can be enhanced)
      if (voiceType) {
        const voiceTypeLower = voiceType.toLowerCase()
        if (voiceTypeLower.includes('male') && voiceTypeLower.includes('deep')) {
          voice = 'onyx'
        } else if (voiceTypeLower.includes('female')) {
          voice = 'nova'
        } else if (voiceTypeLower.includes('neutral')) {
          voice = 'echo'
        }
      }

      parsedSpeakers.push({
        id: `parsed-${Date.now()}-${index}`,
        name: name || `Speaker ${index + 1}`,
        text: text ? text.trim() : '',
        provider,
        voice,
        speed: 1.0,
        generating: false
      })
    })

    return parsedSpeakers
  }

  const handleParseClaudeScript = (autoLoad: boolean = false) => {
    setError('')
    setParsingClaudeScript(true)

    try {
      const parsedSpeakers = parseXMLScript(claudeScript)
      setSpeakers(parsedSpeakers)
      setSuccess(`✅ Parsed ${parsedSpeakers.length} speakers from Claude script!`)

      if (!autoLoad) {
        setShowClaudeInput(false)
        setClaudeScript('')
      }
    } catch (err) {
      setError(`❌ Parse error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setParsingClaudeScript(false)
    }
  }

  // ============================================
  // Prompt-based Generation
  // ============================================

  // @ts-ignore - Unused function kept for future implementation
  const handleGenerateFromPrompt = async () => {
    if (!promptInput.trim()) {
      setError('Please enter a prompt/topic')
      return
    }

    _setGeneratingPrompt(true)
    setError('')
    setSuccess(`🎬 Generating script for topic: "${promptInput.slice(0, 50)}..."`)

    try {
      const result = await claudeScriptService.generateScript({
        prompt: promptInput,
        mode: generationMode,
        speakers_count: _promptSpeakerCount,
        script_style: _promptStyle
      })

      if (result.ok) {
        if (result.value.script) {
          // Mode 1: Auto-load script
          setClaudeScript(result.value.script)
          setSuccess(`✅ Script generated with ${_promptSpeakerCount} speakers! Auto-parsing...`)

          // Auto-parse after short delay
          setTimeout(() => {
            handleParseClaudeScript(true)
          }, 500)
        } else if (result.value.file_path) {
          // Mode 2: File saved
          setSuccess(`✅ Script saved to: ${result.value.file_path}. Upload it to load speakers.`)
        } else if (result.value.queue_id) {
          // Mode 3: Queued
          setSuccess(`✅ Request queued (ID: ${result.value.queue_id}). Polling for result...`)

          // Poll for completion
          const statusResult = await claudeScriptService.pollQueueStatus(result.value.queue_id, 3000, 30)

          if (statusResult.ok && statusResult.value.status === 'completed') {
            setSuccess(`✅ Script completed! File: ${statusResult.value.file_path}. Upload it to load speakers.`)
          }
        }
      } else {
        // @ts-ignore - Result error type
        setError(result.error.detail)
      }
    } catch (err) {
      setError(`Generation failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      _setGeneratingPrompt(false)
    }
  }

  // ============================================
  // File Upload
  // ============================================

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.name.endsWith('.xml')) {
      setError('Please upload an XML file')
      return
    }

    setUploadingFile(true)
    setError('')
    setSuccess('📁 Reading file...')

    try {
      const result = await claudeScriptService.readScriptFile(file)

      if (result.ok) {
        setClaudeScript(result.value)
        setSuccess(`✅ File "${file.name}" loaded! Auto-parsing...`)

        // Auto-parse after short delay
        setTimeout(() => {
          handleParseClaudeScript(true)
        }, 500)
      } else {
        // @ts-ignore - Result error type
        setError(result.error.detail)
      }
    } catch (err) {
      setError(`File upload failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploadingFile(false)
      // Reset file input
      event.target.value = ''
    }
  }

  // ============================================
  // Claude Script Generation (Tri-Modal)
  // ============================================

  // @ts-ignore - Unused function kept for future implementation
  const requestClaudeScript = async (prompt: string) => {
    setError('')
    setSuccess('')

    const modeConfig = GENERATION_MODES.find(m => m.id === generationMode)
    if (!modeConfig) {
      setError('Invalid generation mode')
      return
    }

    try {
      switch (generationMode) {
        case 'pure_api':
          await handlePureAPIMode(prompt)
          break
        case 'api_storage':
          await handleAPIStorageMode(prompt)
          break
        case 'drive_queue':
          await handleDriveQueueMode(prompt)
          break
      }
    } catch (err) {
      setError(`❌ Generation failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // @ts-ignore - Unused function kept for future implementation
  const handlePureAPIMode = async (prompt: string) => {
    setSuccess(`⚡ Mode 1: Sending request to Claude API...`)

    const result = await claudeScriptService.generateScript({
      prompt,
      mode: 'pure_api',
      speakers_count: speakers.length,
      script_style: 'conversational'
    })

    if (result.ok) {
      if (result.value.script) {
        setClaudeScript(result.value.script)
        setShowClaudeInput(true)
        setSuccess(`✅ ${result.value.message} - Cost: ${result.value.cost_estimate}`)
      } else {
        setError('No script returned from API')
      }
    } else {
      // @ts-ignore - Result error type
      setError(result.error.detail)
    }
  }

  // @ts-ignore - Unused function kept for future implementation
  const handleAPIStorageMode = async (prompt: string) => {
    setSuccess(`💾 Mode 2: Sending request to Claude API + saving to storage...`)

    const result = await claudeScriptService.generateScript({
      prompt,
      mode: 'api_storage',
      storage_location: 'desktop', // or 'google_drive'
      speakers_count: speakers.length,
      script_style: 'conversational'
    })

    if (result.ok) {
      if (result.value.file_path) {
        setSuccess(`✅ ${result.value.message} - File: ${result.value.file_path} - Cost: ${result.value.cost_estimate}`)
      } else {
        setError('No file path returned from API')
      }
    } else {
      // @ts-ignore - Result error type
      setError(result.error.detail)
    }
  }

  // @ts-ignore - Unused function kept for future implementation
  const handleDriveQueueMode = async (prompt: string) => {
    setSuccess(`🔄 Mode 3: Saving request to Google Drive queue...`)

    const result = await claudeScriptService.generateScript({
      prompt,
      mode: 'drive_queue',
      speakers_count: speakers.length,
      script_style: 'conversational'
    })

    if (result.ok) {
      if (result.value.queue_id) {
        setSuccess(`✅ ${result.value.message} - Queue ID: ${result.value.queue_id} - Cost: ${result.value.cost_estimate}`)

        // Optional: Start polling for result
        setSuccess(`🔄 Polling for result... (Queue ID: ${result.value.queue_id})`)

        const statusResult = await claudeScriptService.pollQueueStatus(result.value.queue_id, 3000, 30)

        if (statusResult.ok) {
          if (statusResult.value.status === 'completed' && statusResult.value.file_path) {
            setSuccess(`✅ Script completed! File: ${statusResult.value.file_path}`)
          } else if (statusResult.value.status === 'error') {
            setError(`Queue processing failed: ${statusResult.value.error}`)
          }
        } else {
          // @ts-ignore - Result error type
          setError(`Failed to poll queue: ${statusResult.error.detail}`)
        }
      } else {
        setError('No queue ID returned from API')
      }
    } else {
      // @ts-ignore - Result error type
      setError(result.error.detail)
    }
  }

  // ============================================
  // TTS Generation
  // ============================================

  const generateSpeaker = async (id: string) => {
    const speaker = speakers.find(s => s.id === id)
    if (!speaker || !speaker.text.trim()) {
      setError('No text entered')
      return
    }

    const validation = ttsService.validateText(speaker.text, MAX_TEXT_LENGTH)
    if (!validation.valid) {
      setError(validation.error!)
      return
    }

    setError('')
    updateSpeaker(id, { generating: true, audioUrl: undefined })

    const result = await ttsService.generateAudio({
      text: speaker.text,
      provider: speaker.provider,
      voice: speaker.voice,
      speed: speaker.speed
    })

    if (result.ok) {
      updateSpeaker(id, {
        generating: false,
        audioUrl: result.value.audioUrl || undefined
      })
      setSuccess(`✅ ${speaker.name} audio generated!`)
    } else {
      updateSpeaker(id, { generating: false })
      // @ts-ignore - Result error type
      setError(`Error for ${speaker.name}: ${result.error.detail}`)
    }
  }

  // @ts-ignore - Unused function kept for future implementation
  const generateAll = async () => {
    setError('')
    setSuccess('🎬 Generating all speakers...')

    for (const speaker of speakers) {
      if (speaker.text.trim()) {
        await generateSpeaker(speaker.id)
      }
    }

    setSuccess('✅ All speakers done!')
  }

  // ============================================
  // Render
  // ============================================

  // Provider Error Handling
  useEffect(() => {
    if (providerError) {
      setError(`⚠️ TTS Provider Error: ${providerError}`)
    }
  }, [providerError])

  // Show loading screen while providers are being loaded
  if (providersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 dark:text-gray-300">Lade TTS-Provider...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Prüfe welche Services verfügbar sind</p>
        </div>
      </div>
    )
  }

  // Show error if no providers available
  if (!providersLoading && availableProviders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Keine TTS-Provider verfügbar</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Es sind aktuell keine TTS-Provider konfiguriert. Bitte fügen Sie API-Keys in den Admin-Einstellungen hinzu.
          </p>
          <div className="space-y-2">
            <Button onClick={() => router.push('/dashboard/admin/settings')} fullWidth>
              Zu den Einstellungen
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline" fullWidth>
              Zurück zum Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with DashboardNavbar */}
      <DashboardNavbar>
        <Button onClick={() => router.push('/dashboard')} className="text-xs md:text-sm px-2 md:px-4">
          ← Zurück
        </Button>
        <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">🎙️ TTS Generator</h1>
      </DashboardNavbar>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-6 py-3">
          <ErrorAlert message={error} onDismiss={() => setError('')} />
        </div>
      )}
      {success && !error && (
        <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 px-6 py-3">
          <SuccessAlert message={success} onDismiss={() => setSuccess('')} />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* File Upload - COMPACT */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border-2 border-orange-200 dark:border-orange-800">
          <h2 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-3">📁 Upload Script</h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xml"
              onChange={handleFileUpload}
              disabled={uploadingFile}
              className="flex-1 text-sm text-gray-700 dark:text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 file:cursor-pointer disabled:opacity-50"
            />
            {uploadingFile && <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">Uploading...</span>}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Upload XML file with &lt;SPEAKER&gt; tags - speakers auto-detected</p>
        </div>

        {/* Voice Selection - TABS PER PROVIDER */}
        {showVoiceSelection && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">🎤 Voice Selection</h2>
              <button
                onClick={() => setShowVoiceSelection(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Provider Tabs + Favorites + Search */}
            <div className="flex gap-2 mb-4 items-center">
              {/* Provider Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
                <button
                  onClick={() => handleProviderTabChange('FAVORITES')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                    selectedProviderTab === 'FAVORITES'
                      ? 'bg-yellow-500 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  ⭐ Favorites {favoriteVoiceIds.length > 0 && `(${favoriteVoiceIds.length})`}
                </button>
                {availableProviders.map(provider => (
                  <button
                    key={provider}
                    onClick={() => handleProviderTabChange(provider)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                      selectedProviderTab === provider
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {provider === TTSProvider.OPENAI && '🤖 OpenAI'}
                    {provider === TTSProvider.SPEECHIFY && '🗣️ Speechify'}
                    {provider === TTSProvider.GOOGLE && '🆓 Google TTS'}
                    {provider === TTSProvider.MICROSOFT && '🆓 Microsoft Edge'}
                    {provider === TTSProvider.ELEVENLABS && '🎙️ ElevenLabs'}
                  </button>
                ))}
              </div>

              {/* Search Field */}
              <div className="flex-shrink-0">
                <input
                  type="text"
                  placeholder="🔍 Search voices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm w-48"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {languageFilter && `${getLanguageFlag(languageFilter)} `}
                  Language {availableLanguages.length > 0 && `(${availableLanguages.length} available)`}
                </label>
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Languages</option>
                  {availableLanguages.map(lang => (
                    <option key={lang} value={lang}>
                      {getLanguageName(lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {genderFilter && (
                    <>
                      {genderFilter === 'male' && '👨 '}
                      {genderFilter === 'female' && '👩 '}
                      {genderFilter === 'neutral' && '👤 '}
                    </>
                  )}
                  Gender {availableGenders.length > 0 && `(${availableGenders.length} available)`}
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Genders</option>
                  {availableGenders.map(gender => (
                    <option key={gender} value={gender}>
                      {gender === 'male' && 'Male'}
                      {gender === 'female' && 'Female'}
                      {gender === 'neutral' && 'Neutral'}
                      {!['male', 'female', 'neutral'].includes(gender) && `${gender.charAt(0).toUpperCase()}${gender.slice(1)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Voice List */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              {loadingVoices ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loading voices...</p>
                </div>
              ) : filteredVoices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No voices found with selected filters</p>
                  <button
                    onClick={() => {
                      setLanguageFilter('')
                      setGenderFilter('')
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredVoices.map(voice => {
                    const isFavorite = favoriteVoiceIds.includes(voice.id)
                    return (
                      <div
                        key={voice.id}
                        className="p-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group relative"
                      >
                        {/* Favorite Star Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(voice.id)
                          }}
                          className={`absolute top-2 right-2 text-xl transition-all ${
                            isFavorite
                              ? 'text-yellow-500 hover:text-yellow-600 scale-110'
                              : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400 opacity-0 group-hover:opacity-100'
                          }`}
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {isFavorite ? '⭐' : '☆'}
                        </button>

                        <div className="flex items-start justify-between mb-1 pr-8">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{voice.name}</div>
                          {voice.isPremium && (
                            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-bold">💎</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {voice.language.toUpperCase()} • {voice.gender || 'neutral'}
                        </div>
                        {voice.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{voice.description}</p>
                        )}
                        {voice.previewUrl && (
                          <button className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            🔊 Preview
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {filteredVoices.length > 0 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Showing all {filteredVoices.length} voices
                </p>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-900 dark:text-blue-300">
                <strong>💡 Tip:</strong> Voices are loaded automatically when you change tabs or filters.
                {selectedProviderTab === TTSProvider.GOOGLE && ' Google TTS is FREE - no API key needed!'}
                {selectedProviderTab === TTSProvider.MICROSOFT && ' Microsoft Edge TTS is FREE - no API key needed!'}
              </p>
            </div>
          </div>
        )}

        {!showVoiceSelection && (
          <div className="mb-6 text-center">
            <button
              onClick={() => setShowVoiceSelection(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
            >
              🎤 Show Voice Selection
            </button>
          </div>
        )}

        {/* Generation Mode Selector */}
        {showModeSelector && (
          <div className="relative mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(168 85 247), 0 0 40px rgb(168 85 247 / 0.4)' }} />
            <div className="relative">
              <h2 className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-4">⚙️ Claude Script Generation Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {GENERATION_MODES.map(mode => (
                <div
                  key={mode.id}
                  onClick={() => setGenerationMode(mode.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    generationMode === mode.id
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-100 dark:bg-purple-900/30 shadow-lg'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-purple-400 dark:hover:border-purple-500'
                  }`}
                >
                  <div className="text-3xl mb-2">{mode.icon}</div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{mode.name}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">{mode.description}</p>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full inline-block ${
                    mode.costLevel === 'high' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                    mode.costLevel === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                    'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  }`}>
                    Cost: {mode.costLevel.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                <strong>Selected:</strong> {GENERATION_MODES.find(m => m.id === generationMode)?.name}
              </p>
            </div>
            </div>
          </div>
        )}

        {/* Claude Script Input */}
        {showClaudeInput && (
          <div className="relative mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(59 130 246), 0 0 40px rgb(59 130 246 / 0.4)' }} />
            <div className="relative">
              <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-3">📝 Claude Script Parser</h2>
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
              Paste your Claude-generated script with <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 px-1 rounded">&lt;SPEAKER&gt;</code> tags:
            </p>
            <Textarea
              value={claudeScript}
              onChange={(e) => setClaudeScript(e.target.value)}
              placeholder={'<SPEAKER name="Host" voice_type="male_energetic">\n  Welcome to our podcast!\n</SPEAKER>\n<SPEAKER name="Guest" voice_type="female_friendly">\n  Thanks for having me!\n</SPEAKER>'}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => handleParseClaudeScript()}
                disabled={parsingClaudeScript || !claudeScript.trim()}
                loading={parsingClaudeScript}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {parsingClaudeScript ? 'Parsing...' : '✨ Parse & Load Speakers'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowClaudeInput(false)}
              >
                Cancel
              </Button>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-900 dark:text-yellow-300">
                <strong className="text-yellow-900 dark:text-yellow-200">Expected format:</strong> <code className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200 px-1 rounded">&lt;SPEAKER name="SpeakerName" voice_type="male_deep|female_friendly|neutral"&gt;Text here&lt;/SPEAKER&gt;</code>
              </p>
            </div>
            </div>
          </div>
        )}

        {/* Speakers */}
        <div className="space-y-6">
          {speakers.map((speaker, index) => (
            <div key={speaker.id} className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
              <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(99 102 241), 0 0 40px rgb(99 102 241 / 0.4)' }} />
              <div className="relative">
              {/* Speaker Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    #{index + 1}
                  </div>
                  <input
                    type="text"
                    value={speaker.name}
                    onChange={(e) => updateSpeaker(speaker.id, { name: e.target.value })}
                    className="text-lg font-semibold px-2 py-1 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 focus:outline-none bg-transparent text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="small"
                    onClick={() => generateSpeaker(speaker.id)}
                    disabled={speaker.generating || !speaker.text.trim()}
                    loading={speaker.generating}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {speaker.generating ? 'Generating...' : '▶ Generate'}
                  </Button>
                  {speakers.length > 1 && (
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => removeSpeaker(speaker.id)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>

              {/* Text Input */}
              <div className="mb-4">
                <Textarea
                  label={`Text for ${speaker.name}`}
                  value={speaker.text}
                  onChange={(e) => updateSpeaker(speaker.id, { text: e.target.value })}
                  placeholder="Enter text here..."
                  rows={speakers.length === 1 ? 8 : 4}
                  showCounter
                  counterMax={MAX_TEXT_LENGTH}
                />
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Provider */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Provider
                  </label>
                  <select
                    value={speaker.provider}
                    onChange={(e) => {
                      const newProvider = e.target.value as TTSProvider
                      const voices = getVoicesForProvider(newProvider)
                      updateSpeaker(speaker.id, {
                        provider: newProvider,
                        voice: voices[0]?.id || 'alloy'
                      })
                    }}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {/* Only show available providers */}
                    {availableProviders.map(provider => (
                      <option key={provider} value={provider}>
                        {provider === TTSProvider.OPENAI && 'OpenAI'}
                        {provider === TTSProvider.SPEECHIFY && 'Speechify'}
                        {provider === TTSProvider.ELEVENLABS && 'ElevenLabs'}
                        {provider === TTSProvider.GOOGLE && 'Google TTS (FREE)'}
                        {provider === TTSProvider.MICROSOFT && 'Microsoft Edge TTS (FREE)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Voice */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Voice
                  </label>
                  <VoiceSelector
                    voices={getVoicesForProvider(speaker.provider)}
                    selectedVoiceId={speaker.voice}
                    onChange={(voiceId) => updateSpeaker(speaker.id, { voice: voiceId })}
                    provider={speaker.provider}
                    disabled={loadingVoices}
                  />
                </div>

                {/* Speed */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Speed: {speaker.speed}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speaker.speed}
                    onChange={(e) => updateSpeaker(speaker.id, { speed: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>2.0x</span>
                  </div>
                </div>
              </div>

              {/* Audio Player */}
              {speaker.audioUrl && (
                <div className="mt-4 p-4 bg-gradient-to-br from-green-600 to-teal-600 rounded-xl text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">{speaker.name} - Audio ready!</span>
                  </div>

                  <audio
                    controls
                    src={speaker.audioUrl}
                    className="w-full mb-3"
                  />

                  <a
                    href={speaker.audioUrl}
                    download={`${speaker.name}.mp3`}
                    className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all text-sm"
                  >
                    ⬇️ Download {speaker.name}
                  </a>
                </div>
              )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Speaker Button */}
        <div className="mt-6">
          <Button
            onClick={addSpeaker}
            fullWidth
            className="bg-green-600 hover:bg-green-700 text-lg py-4"
          >
            ➕ Add Speaker
          </Button>
        </div>

        {/* Info Box */}
        <div className="relative mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(59 130 246), 0 0 40px rgb(59 130 246 / 0.4)' }} />
          <div className="relative">
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">💡 Usage Tips</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong className="text-blue-900 dark:text-blue-200">Single Speaker:</strong> Start with one speaker for simple TTS</li>
            <li>• <strong className="text-blue-900 dark:text-blue-200">Multi-Speaker:</strong> Click "➕ Add Speaker" for conversations or podcasts</li>
            <li>• <strong className="text-blue-900 dark:text-blue-200">Claude Script:</strong> Use "📝 Claude Script" to paste AI-generated multi-speaker scripts with <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 px-1 rounded">&lt;SPEAKER&gt;</code> tags</li>
            <li>• <strong className="text-blue-900 dark:text-blue-200">Generation Mode:</strong> Choose cost/complexity tradeoff with "⚙️ Generation Mode"</li>
            <li>• <strong className="text-blue-900 dark:text-blue-200">Batch Generate:</strong> Use "▶ Generate All" to process all speakers at once</li>
          </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
