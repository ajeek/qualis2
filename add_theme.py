import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add theme state inside App component
theme_state = """  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("qualis-theme");
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
    return "dark";
  });

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("qualis-theme", theme);
  }, [theme]);

"""
content = re.sub(
    r'(const \[state, setState\] = useState<AppState>\(\{ phase: "disconnected" \}\);\n)',
    r'\1\n' + theme_state,
    content
)

# Replace <div className="flex items-center gap-4"> with the one including theme toggle
theme_toggle = """<div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-2 text-muted hover:text-primary transition-colors focus:outline-none"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>"""
content = re.sub(
    r'<div className="flex items-center gap-4">',
    theme_toggle,
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
