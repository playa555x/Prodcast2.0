#!/usr/bin/env python3
"""
Fix Account and Admin pages to match Dashboard design
"""

import os

# Fix Account page
print("Fixing Account page...")
with open('account/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all Card components with glassmorphism
content = content.replace(
    '          <Card>',
    '''          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(147 51 234), 0 0 40px rgb(147 51 234 / 0.4)' }} />
            <div className="relative z-10">'''
)

content = content.replace(
    '          </Card>',
    '''            </div>
          </div>'''
)

# Fix any remaining hardcoded colors
content = content.replace('bg-blue-50', 'bg-gray-50 dark:bg-gray-900')
content = content.replace('bg-green-50', 'bg-gray-50 dark:bg-gray-900')
content = content.replace('bg-indigo-50', 'bg-gray-50 dark:bg-gray-900')
content = content.replace('bg-purple-50', 'bg-gray-50 dark:bg-gray-900')

content = content.replace('border-blue-200', 'border-gray-200 dark:border-gray-700')
content = content.replace('border-green-200', 'border-gray-200 dark:border-gray-700')
content = content.replace('border-indigo-200', 'border-gray-200 dark:border-gray-700')
content = content.replace('border-purple-200', 'border-gray-200 dark:border-gray-700')

# Fix text colors for dark mode
content = content.replace('text-blue-900"', 'text-gray-900 dark:text-gray-100"')
content = content.replace('text-green-900"', 'text-gray-900 dark:text-gray-100"')
content = content.replace('text-indigo-900"', 'text-gray-900 dark:text-gray-100"')
content = content.replace('text-purple-900"', 'text-gray-900 dark:text-gray-100"')

with open('account/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("OK Account page fixed")

# Fix Admin Users page
if os.path.exists('admin/users/page.tsx'):
    print("Fixing Admin Users page...")
    with open('admin/users/page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace Card components
    content = content.replace(
        '          <Card>',
        '''          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(239 68 68), 0 0 40px rgb(239 68 68 / 0.4)' }} />
            <div className="relative z-10">'''
    )

    content = content.replace(
        '        <Card>',
        '''        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(239 68 68), 0 0 40px rgb(239 68 68 / 0.4)' }} />
          <div className="relative z-10">'''
    )

    content = content.replace('</Card>', '''          </div>
        </div>''')

    # Fix colors
    content = content.replace('bg-red-50', 'bg-gray-50 dark:bg-gray-900')
    content = content.replace('bg-yellow-50', 'bg-gray-50 dark:bg-gray-900')
    content = content.replace('bg-blue-50', 'bg-gray-50 dark:bg-gray-900')

    content = content.replace('border-red-200', 'border-gray-200 dark:border-gray-700')
    content = content.replace('border-yellow-200', 'border-gray-200 dark:border-gray-700')
    content = content.replace('border-blue-200', 'border-gray-200 dark:border-gray-700')

    with open('admin/users/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("OK Admin Users page fixed")

# Fix Admin Settings page
if os.path.exists('admin/settings/page.tsx'):
    print("Fixing Admin Settings page...")
    with open('admin/settings/page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace Card components
    content = content.replace(
        '          <Card>',
        '''          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
            <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(239 68 68), 0 0 40px rgb(239 68 68 / 0.4)' }} />
            <div className="relative z-10">'''
    )

    content = content.replace(
        '        <Card>',
        '''        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 dark:border-gray-700 hover:border-opacity-0">
          <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgb(239 68 68), 0 0 40px rgb(239 68 68 / 0.4)' }} />
          <div className="relative z-10">'''
    )

    content = content.replace('</Card>', '''          </div>
        </div>''')

    # Fix colors
    content = content.replace('bg-red-50', 'bg-gray-50 dark:bg-gray-900')
    content = content.replace('bg-yellow-50', 'bg-gray-50 dark:bg-gray-900')
    content = content.replace('bg-blue-50', 'bg-gray-50 dark:bg-gray-900')
    content = content.replace('bg-green-50', 'bg-gray-50 dark:bg-gray-900')

    content = content.replace('border-red-200', 'border-gray-200 dark:border-gray-700')
    content = content.replace('border-yellow-200', 'border-gray-200 dark:border-gray-700')
    content = content.replace('border-blue-200', 'border-gray-200 dark:border-gray-700')
    content = content.replace('border-green-200', 'border-gray-200 dark:border-gray-700')

    with open('admin/settings/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("OK Admin Settings page fixed")

print("\nAll pages fixed successfully!")
