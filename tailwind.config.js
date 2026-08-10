/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-secondary": "rgb(var(--surface-secondary) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        primary: "rgb(var(--text-primary) / <alpha-value>)",
        secondary: "rgb(var(--text-secondary) / <alpha-value>)",
        muted: "rgb(var(--text-muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-hover": "rgb(var(--accent-hover) / <alpha-value>)",
        error: "rgb(var(--error) / <alpha-value>)",
        button: "rgb(var(--button-bg) / <alpha-value>)",
        "button-text": "rgb(var(--button-text) / <alpha-value>)",
        "button-hover": "rgb(var(--button-hover) / <alpha-value>)",
        "selection-bg": "rgb(var(--selection-bg) / <alpha-value>)",
        "selection-text": "rgb(var(--selection-text) / <alpha-value>)",
      }
    },
  },
  plugins: [],
};
