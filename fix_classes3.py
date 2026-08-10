import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

replacements = {
    r'text-white group-hover:text-accent': 'text-primary group-hover:text-accent',
    r'bg-emerald-600 text-white text-sm font-semibold rounded hover:bg-accent': 'bg-accent text-white text-sm font-semibold rounded hover:bg-accent-hover',
    r'text-amber-200/80': 'text-amber-700 dark:text-amber-200/80',
    r'bg-amber-500/10 border-amber-500/20': 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
}

for old, new in replacements.items():
    content = re.sub(old, new, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
