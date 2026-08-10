import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

replacements = {
    r'border-emerald-900/50 bg-emerald-950/20': 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20',
}

for old, new in replacements.items():
    content = re.sub(old, new, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
