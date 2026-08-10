import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

replacements = {
    r'placeholder:text-neutral-700': 'placeholder:text-muted',
    r'focus:border-neutral-600': 'focus:border-secondary',
    r'border-neutral-700': 'border-border',
    r'border-neutral-900': 'border-border',
    r'text-neutral-700': 'text-muted',
    r'bg-button-hover text-neutral-950 text-sm font-semibold rounded hover:bg-white': 'bg-button text-button-text text-sm font-semibold rounded hover:bg-button-hover',
    r'bg-button text-button-text font-semibold rounded hover:bg-button-hover transition-colors disabled:opacity-50': 'bg-button text-button-text font-semibold rounded hover:bg-button-hover transition-colors disabled:opacity-50',
    r'bg-button text-button-text font-semibold rounded hover:bg-neutral-200 transition-colors disabled:opacity-50': 'bg-button text-button-text font-semibold rounded hover:bg-button-hover transition-colors disabled:opacity-50',
    r'bg-white': 'bg-surface',
}

for old, new in replacements.items():
    content = re.sub(old, new, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
