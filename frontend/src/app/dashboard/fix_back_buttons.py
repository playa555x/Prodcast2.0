#!/usr/bin/env python3
"""
Unify back buttons across all pages to match Trending design
"""

import os

pages = [
    ('podcast/page.tsx', 'Podcast Generator'),
    ('history/page.tsx', '📚 Podcast History'),
    ('account/page.tsx', 'Mein Account')
]

for page_path, title in pages:
    if not os.path.exists(page_path):
        continue

    print(f"Fixing {page_path}...")

    with open(page_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace the back button section
    # Pattern 1: Simple back button in header
    if 'onClick={() => router.push(\'/dashboard\')}' in content:
        # Replace the button part to match Trending style
        content = content.replace(
            '''          <Button
            variant="ghost"
            size="small"
            onClick={() => router.push('/dashboard')}
          >
            ← Back
          </Button>''',
            '''          <Button
                variant="ghost"
                size="small"
                onClick={() => router.push('/dashboard')}
              >
                ← Zurück
              </Button>'''
        )

        content = content.replace(
            '''        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
                variant="ghost"
                size="small"
                onClick={() => router.push('/dashboard')}
              >
                ← Zurück
              </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Podcast Generator</h1>
        </div>''',
            '''        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="small"
                onClick={() => router.push('/dashboard')}
              >
                ← Zurück
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Podcast Generator</h1>
            </div>
          </div>
        </div>'''
        )

    # Pattern 2: Account page back button
    if 'Mein Account' in content:
        content = content.replace(
            '<Button onClick={() => router.push(\'/dashboard\')}>← Zurück zum Dashboard</Button>',
            '''<div className="flex items-center gap-3">
              <Button onClick={() => router.push('/dashboard')}>← Zurück</Button>
            </div>'''
        )

    # Pattern 3: History page back button
    if '📚 Podcast History' in content:
        content = content.replace(
            '''            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="small"
                onClick={() => router.push('/dashboard')}
              >
                ← Zurück
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                📚 Podcast History
              </h1>
            </div>''',
            '''            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                📚 Podcast History
              </h1>
            </div>'''
        )

        content = content.replace(
            '''            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredPodcasts.length} von {podcasts.length} Podcasts
            </div>''',
            '''            <div className="flex items-center gap-3">
              <Button onClick={() => router.push('/dashboard')}>← Zurück</Button>
            </div>'''
        )

    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"OK {page_path}")

print("\nAll back buttons unified!")
