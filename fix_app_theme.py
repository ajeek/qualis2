import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

new_logic = """  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("qualis-theme");
      if (saved === "light" || saved === "dark") return saved;
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch (e) {}
    return "light";
  });"""

content = re.sub(
    r'  const \[theme, setTheme\] = useState<"light" \| "dark">\(\(\) => \{.*?\n.*?return "dark";\n  \}\);',
    new_logic,
    content,
    flags=re.DOTALL
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
