import re

with open('index.html', 'r') as f:
    content = f.read()

script = """    <script>
      (function() {
        try {
          var saved = localStorage.getItem('qualis-theme');
          var dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (dark) {
            document.documentElement.classList.add('dark');
          }
        } catch (e) {}
      })();
    </script>
  </head>"""

content = re.sub(r'\s*</head>', script, content)

with open('index.html', 'w') as f:
    f.write(content)
