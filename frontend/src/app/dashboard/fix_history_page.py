#!/usr/bin/env python3
"""
Fix History page to match Dashboard design
"""

with open('history/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace all Card components with glassmorphism structure
# Filters Card (cyan glow)
content = content.replace(
    '        <Card className="mb-6">',
    '''        <div className="relative mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(6 182 212), 0 0 40px rgb(6 182 212 / 0.4)' }} />
          <div className="relative z-10">'''
)

# Empty state Card
content = content.replace(
    '          <Card>',
    '''          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(99 102 241), 0 0 40px rgb(99 102 241 / 0.4)' }} />
            <div className="relative z-10">'''
)

# Podcast Item Cards
content = content.replace(
    '              <Card key={podcast.production_job_id} className="hover:shadow-2xl transition-all shadow-xl rounded-2xl">',
    '''              <div key={podcast.production_job_id} className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
                <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(6 182 212), 0 0 40px rgb(6 182 212 / 0.4)' }} />
                <div className="relative z-10">'''
)

# Replace closing </Card> tags
content = content.replace(
    '              </Card>',
    '''                </div>
              </div>'''
)

content = content.replace(
    '          </Card>',
    '''            </div>
          </div>'''
)

content = content.replace(
    '        </Card>',
    '''          </div>
        </div>'''
)

# 2. Fix status badges and improve dark mode
content = content.replace(
    '<span className="ml-4 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">',
    '<span className="ml-4 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">'
)

content = content.replace(
    '<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">',
    '<span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">'
)

# 3. Fix text colors for better dark mode support
content = content.replace(
    '<h3 className="text-xl font-bold text-gray-900 mb-1">',
    '<h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">'
)

content = content.replace(
    '<p className="text-sm text-gray-600 line-clamp-2">',
    '<p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">'
)

# 4. Fix share modal dark mode
content = content.replace(
    '<input type="text" value={shareUrl} readOnly className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 bg-gray-50" />',
    '<input type="text" value={shareUrl} readOnly className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />'
)

with open('history/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('OK History page fixed')
