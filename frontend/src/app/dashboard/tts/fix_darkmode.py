import re

# Read file
with open('page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix patterns - add dark: variants where missing
fixes = [
    # Fix text-gray-900 without dark variant
    (r'text-gray-900(?! dark)', 'text-gray-900 dark:text-white'),

    # Fix text-gray-800 without dark variant
    (r'text-gray-800(?! dark)', 'text-gray-800 dark:text-gray-100'),

    # Fix text-gray-700 without dark variant
    (r'text-gray-700(?! dark)', 'text-gray-700 dark:text-gray-200'),

    # Fix text-gray-600 without dark variant
    (r'text-gray-600(?! dark)', 'text-gray-600 dark:text-gray-300'),

    # Fix text-gray-500 without dark variant (but not if already has dark:)
    (r'text-gray-500(?! dark)', 'text-gray-500 dark:text-gray-400'),

    # Fix bg-white without dark variant (but not if it's bg-white/XX)
    (r'bg-white(?! dark)(?!/)', 'bg-white dark:bg-gray-800'),

    # Fix badge backgrounds
    (r'bg-indigo-100 text-indigo-800(?! dark)', 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'),
    (r'bg-green-100 text-green-800(?! dark)', 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'),
    (r'bg-yellow-100 text-yellow-800(?! dark)', 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'),
    (r'bg-orange-100 text-orange-800(?! dark)', 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'),
    (r'bg-red-100 text-red-800(?! dark)', 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'),
]

# Apply fixes
for pattern, replacement in fixes:
    content = re.sub(pattern, replacement, content)

# Write back
with open('page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Dark mode fixes applied successfully!')
print('Fixed patterns:')
print('- text-gray-XXX → added dark: variants')
print('- bg-white → added dark:bg-gray-800')
print('- badge colors → added dark: variants')
