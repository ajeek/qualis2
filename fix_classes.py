import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

replacements = {
    r'bg-neutral-950': 'bg-background',
    r'text-neutral-200': 'text-primary',
    r'border-neutral-800': 'border-border',
    r'text-neutral-400': 'text-secondary',
    r'text-neutral-500': 'text-muted',
    r'bg-neutral-900': 'bg-surface',
    r'bg-neutral-800': 'bg-surface-secondary',
    r'text-emerald-400': 'text-accent',
    r'text-emerald-500': 'text-accent',
    r'bg-emerald-500': 'bg-accent',
    r'bg-emerald-400': 'bg-accent',
    r'text-red-400': 'text-error',
    r'text-red-500': 'text-error',
    r'border-emerald-500/20': 'border-accent/20',
    r'border-red-500/20': 'border-error/20',
    r'text-neutral-300': 'text-primary',
    r'text-neutral-600': 'text-muted',
    r'bg-white text-neutral-950': 'bg-button text-button-text',
    r'bg-neutral-200': 'bg-button-hover',
    r'bg-emerald-900': 'bg-selection-bg',
    r'text-emerald-100': 'text-selection-text',
    r'selection:bg-emerald-900 selection:text-emerald-100': 'selection:bg-selection-bg selection:text-selection-text',
    r'bg-neutral-600': 'bg-muted',
    r'hover:bg-neutral-800': 'hover:bg-surface-secondary',
    r'focus:border-neutral-700': 'focus:border-text-secondary',
}

for old, new in replacements.items():
    content = re.sub(old, new, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
