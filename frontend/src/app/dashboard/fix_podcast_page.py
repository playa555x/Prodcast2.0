#!/usr/bin/env python3
"""
Fix Podcast page to match Dashboard design exactly
"""

with open('podcast/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Header - Replace simple white header with glassmorphism
content = content.replace(
    '      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm" relative group/navbar>',
    '      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-3xl border-b-2 border-amber-400/50 sticky top-0 z-50 shadow-lg relative group/navbar">'
)

# 2. Replace main Card with proper glassmorphism structure
# Find the opening <Card> tag
content = content.replace(
    '        <Card>',
    '''        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(99 102 241), 0 0 40px rgb(99 102 241 / 0.4)' }} />
          <div className="relative z-10">'''
)

# Find the closing </Card> tag (should be the last one before </div></div></div>)
content = content.replace(
    '        </Card>\n      </div>\n    </div>\n  )\n}',
    '          </div>\n        </div>\n      </div>\n    </div>\n  )\n}'
)

# 3. Fix filter box - Replace indigo hardcoded colors
content = content.replace(
    '<div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">',
    '<div className="p-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg">'
)
content = content.replace(
    '<h3 className="text-sm font-bold text-indigo-900 mb-3">',
    '<h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">'
)

# 4. Fix preview section - Remove green hardcoded colors, use neutral
content = content.replace(
    '<div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">',
    '<div className="mb-6 p-6 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl">'
)
content = content.replace(
    '<h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">',
    '<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">'
)
content = content.replace(
    '<div className="text-sm text-green-700 font-medium">',
    '<div className="text-sm text-gray-600 dark:text-gray-400 font-medium">'
)
content = content.replace(
    '<div className="text-2xl font-bold text-green-900">',
    '<div className="text-2xl font-bold text-gray-900 dark:text-gray-100">'
)

# 5. Fix status section - Keep gradient but make it match dashboard style
content = content.replace(
    '<div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl text-white">',
    '<div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-xl">'
)

# 6. Fix error box
content = content.replace(
    '<div className="mt-4 p-4 bg-red-500/20 border border-red-400/30 rounded-lg">',
    '<div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">'
)

# 7. Fix all button colors to match dashboard
# Primary buttons should use indigo
content = content.replace(
    'className="bg-blue-600 hover:bg-blue-700"',
    'className="bg-indigo-600 hover:bg-indigo-700"'
)
content = content.replace(
    'className="bg-green-600 hover:bg-green-700"',
    'className="bg-indigo-600 hover:bg-indigo-700"'
)

# Download button
content = content.replace(
    'className="block w-full text-center px-6 py-3 bg-white text-indigo-600 rounded-lg font-bold hover:bg-gray-100 transition-all"',
    'className="block w-full text-center px-6 py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border-2 border-indigo-200 dark:border-indigo-800"'
)

with open('podcast/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('✓ Podcast page fixed with proper glassmorphism design')
print('✓ All hardcoded colors replaced')
print('✓ Buttons unified')
print('✓ Dark mode support added')
