import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

replacements = {
    r'border-amber-800 bg-amber-950/30': 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    r'text-amber-400 font-semibold mb-2': 'text-amber-700 dark:text-amber-400 font-semibold mb-2',
    r'border-amber-700 text-amber-400 rounded hover:bg-amber-900/50': 'border-amber-400 text-amber-700 dark:border-amber-700 dark:text-amber-400 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50',
    r'bg-amber-900 text-amber-400': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400',
    r'text-amber-400': 'text-amber-700 dark:text-amber-400',
    r'text-amber-500 animate-pulse': 'text-amber-600 dark:text-amber-500 animate-pulse',
}

for old, new in replacements.items():
    content = re.sub(old, new, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
