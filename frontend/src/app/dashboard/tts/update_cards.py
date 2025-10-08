#!/usr/bin/env python3
"""
Script to update TTS page cards to match dashboard glassmorphism design
"""

with open('page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Prompt Generator Card - Green
content = content.replace(
    '        {/* Prompt Generator */}\n        <Card className="mb-6 border-2 border-green-300 bg-green-50">',
    '''        {/* Prompt Generator */}
        <div className="relative mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(34 197 94), 0 0 40px rgb(34 197 94 / 0.4)' }} />
          <div className="relative">'''
)

content = content.replace(
    '          <h2 className="text-xl font-bold text-green-900 mb-4">🎬 Generate Script from Topic</h2>',
    '            <h2 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4">🎬 Generate Script from Topic</h2>'
)

# Close Prompt Generator Card - find first closing </Card> after Prompt Generator
# Need to find the specific one after "Current mode:" info box
prompt_gen_close = '''            </div>
          </div>
        </Card>

        {/* File Upload */}'''

prompt_gen_close_new = '''            </div>
          </div>
          </div>
        </div>

        {/* File Upload */}'''

content = content.replace(prompt_gen_close, prompt_gen_close_new)

# 2. File Upload Card - Orange
content = content.replace(
    '        {/* File Upload */}\n        <Card className="mb-6 border-2 border-orange-300 bg-orange-50">',
    '''        {/* File Upload */}
        <div className="relative mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(249 115 22), 0 0 40px rgb(249 115 22 / 0.4)' }} />
          <div className="relative">'''
)

content = content.replace(
    '          <h2 className="text-xl font-bold text-orange-900 mb-4">📁 Upload Existing Script</h2>',
    '            <h2 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4">📁 Upload Existing Script</h2>'
)

# Close File Upload Card
file_upload_close = '''            </div>
          </div>
        </Card>

        {/* Generation Mode Selector */}'''

file_upload_close_new = '''            </div>
          </div>
          </div>
        </div>

        {/* Generation Mode Selector */}'''

content = content.replace(file_upload_close, file_upload_close_new)

# 3. Generation Mode Selector - Purple
content = content.replace(
    '          <Card className="mb-6 border-2 border-purple-300 bg-purple-50">',
    '''          <div className="relative mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(168 85 247), 0 0 40px rgb(168 85 247 / 0.4)' }} />
            <div className="relative">'''
)

content = content.replace(
    '            <h2 className="text-xl font-bold text-purple-900 mb-4">⚙️ Claude Script Generation Mode</h2>',
    '              <h2 className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-4">⚙️ Claude Script Generation Mode</h2>'
)

# Close Generation Mode Selector
mode_selector_close = '''            </div>
          </Card>
        )}'''

mode_selector_close_new = '''            </div>
            </div>
          </div>
        )}'''

content = content.replace(mode_selector_close, mode_selector_close_new)

# 4. Claude Script Input - Blue
content = content.replace(
    '          <Card className="mb-6 border-2 border-blue-300 bg-blue-50">',
    '''          <div className="relative mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(59 130 246), 0 0 40px rgb(59 130 246 / 0.4)' }} />
            <div className="relative">'''
)

content = content.replace(
    '            <h2 className="text-xl font-bold text-blue-900 mb-3">📝 Claude Script Parser</h2>',
    '              <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-3">📝 Claude Script Parser</h2>'
)

# Close Claude Script Input (reuse same pattern as mode selector)
content = content.replace(mode_selector_close, mode_selector_close_new)

# 5. ElevenLabs Filters - Indigo
content = content.replace(
    '          <Card className="mb-6 bg-indigo-50 border-2 border-indigo-200">',
    '''          <div className="relative mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(99 102 241), 0 0 40px rgb(99 102 241 / 0.4)' }} />
            <div className="relative">'''
)

content = content.replace(
    '            <h3 className="text-sm font-bold text-indigo-900 mb-3">🔍 ElevenLabs Voice Filters (Global)</h3>',
    '              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-3">🔍 ElevenLabs Voice Filters (Global)</h3>'
)

# Close ElevenLabs Filters (reuse same pattern)
content = content.replace(mode_selector_close, mode_selector_close_new)

# 6. Speaker Cards - Indigo glow
content = content.replace(
    '            <Card key={speaker.id} className="relative">',
    '''            <div key={speaker.id} className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
              <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(99 102 241), 0 0 40px rgb(99 102 241 / 0.4)' }} />
              <div className="relative">'''
)

# Close Speaker Card
speaker_close = '''              )}
            </Card>
          ))}'''

speaker_close_new = '''              )}
              </div>
            </div>
          ))}'''

content = content.replace(speaker_close, speaker_close_new)

# 7. Info Box - Blue
content = content.replace(
    '        {/* Info Box */}\n        <Card className="mt-6 bg-blue-50 border-blue-200">',
    '''        {/* Info Box */}
        <div className="relative mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(59 130 246), 0 0 40px rgb(59 130 246 / 0.4)' }} />
          <div className="relative">'''
)

content = content.replace(
    '          <h3 className="text-lg font-bold text-blue-900 mb-2">💡 Usage Tips</h3>',
    '            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">💡 Usage Tips</h3>'
)

# Close Info Box
info_close = '''          </ul>
        </Card>
      </div>
    </div>
  )
}'''

info_close_new = '''          </ul>
          </div>
        </div>
      </div>
    </div>
  )
}'''

content = content.replace(info_close, info_close_new)

# Write updated content
with open('page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ TTS page cards updated successfully!")
print("All cards now match dashboard glassmorphism design")
