#!/usr/bin/env python3
"""
Fix Trending page to match Dashboard design
"""

with open('trending/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace all Card components with glassmorphism structure
# Main Cards
content = content.replace(
    '                <Card>',
    '''                <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
                  <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(249 115 22), 0 0 40px rgb(249 115 22 / 0.4)' }} />
                  <div className="relative z-10">'''
)

# Info Card (blue)
content = content.replace(
    '                <Card className="bg-blue-50 border-blue-200">',
    '''                <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
                  <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(59 130 246), 0 0 40px rgb(59 130 246 / 0.4)' }} />
                  <div className="relative z-10">'''
)

# Replace closing </Card> tags
content = content.replace('</Card>', '''  </div>
                </div>''')

# 2. Fix hardcoded orange/red colors in Google Trends cards
content = content.replace(
    'className="p-4 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl hover:shadow-2xl transition-all shadow-lg"',
    'className="p-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-2xl transition-all"'
)

# 3. Fix hardcoded indigo/purple colors in Podcast Ideas
content = content.replace(
    'className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl hover:shadow-2xl transition-all shadow-xl"',
    'className="p-5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-2xl transition-all"'
)

# 4. Fix News and Reddit cards - they already have good base colors, just ensure proper dark mode
content = content.replace(
    'className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-300 hover:shadow-2xl transition-all cursor-pointer shadow-lg"',
    'className="p-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-2xl transition-all cursor-pointer"'
)

content = content.replace(
    'className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-orange-300 hover:shadow-2xl transition-all cursor-pointer shadow-lg"',
    'className="p-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-2xl transition-all cursor-pointer"'
)

# 5. Unify button colors to indigo
content = content.replace(
    'className="bg-indigo-600 hover:bg-indigo-700"',
    'className="bg-indigo-600 hover:bg-indigo-700 text-white"'
)

# 6. Fix error box
content = content.replace(
    '<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">',
    '<div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">'
)

with open('trending/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('OK Trending page fixed')
