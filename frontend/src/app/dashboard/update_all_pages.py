#!/usr/bin/env python3
"""
Batch update all dashboard pages to match glassmorphism design
"""

import os

pages_to_update = [
    'podcast/page.tsx',
    'studio/page.tsx',
    'trending/page.tsx',
    'history/page.tsx',
    'account/page.tsx'
]

def update_page(page_path):
    """Update a single page with glassmorphism design"""
    if not os.path.exists(page_path):
        print(f'SKIP: {page_path} not found')
        return False

    with open(page_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Update header to gold border if it has a different color
    content = content.replace(
        'border-b-2 border-blue-400/50',
        'border-b-2 border-amber-400/50'
    )
    content = content.replace(
        'border-b-2 border-purple-400/50',
        'border-b-2 border-amber-400/50'
    )
    content = content.replace(
        'border-b-2 border-green-400/50',
        'border-b-2 border-amber-400/50'
    )
    content = content.replace(
        'border-b-2 border-pink-400/50',
        'border-b-2 border-amber-400/50'
    )
    content = content.replace(
        'border-b-2 border-red-400/50',
        'border-b-2 border-amber-400/50'
    )

    # 2. Add golden glow effect to header if not present
    if 'Golden Border Glow Effect' not in content:
        # Find various header patterns
        for pattern in [
            '<div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-3xl border-b-2 border-amber-400/50 sticky top-0 z-50 shadow-lg">',
            '<div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-3xl border-b-2 border-amber-400/50 sticky top-0 z-10 shadow-lg">',
            '<div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">',
            '<div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">',
        ]:
            if pattern in content:
                replacement = pattern.replace('>', ' relative group/navbar>\n        {/* Golden Border Glow Effect */}\n        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-0 group-hover/navbar:opacity-100 transition-opacity duration-500 blur-sm" />\n')
                content = content.replace(pattern, replacement)
                break

    # 3. Update background to support dark mode
    content = content.replace(
        'className="min-h-screen bg-gray-50">',
        'className="min-h-screen bg-gray-50 dark:bg-gray-900">'
    )
    content = content.replace(
        'className="min-h-screen bg-white">',
        'className="min-h-screen bg-gray-50 dark:bg-gray-900">'
    )

    # 4. Update all text colors to support dark mode
    content = content.replace(
        'text-gray-700">',
        'text-gray-700 dark:text-gray-300">'
    )
    content = content.replace(
        'text-gray-600">',
        'text-gray-600 dark:text-gray-400">'
    )
    content = content.replace(
        'text-gray-500">',
        'text-gray-500 dark:text-gray-400">'
    )
    content = content.replace(
        'text-gray-900">',
        'text-gray-900 dark:text-gray-100">'
    )

    # Check if changes were made
    if content == original:
        print(f'NO CHANGES: {page_path}')
        return False

    # Write back
    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'UPDATED: {page_path}')
    return True

# Main
base_dir = os.path.dirname(os.path.abspath(__file__))
updated_count = 0

for page in pages_to_update:
    page_path = os.path.join(base_dir, page)
    if update_page(page_path):
        updated_count += 1

print(f'\nSummary: {updated_count}/{len(pages_to_update)} pages updated')
