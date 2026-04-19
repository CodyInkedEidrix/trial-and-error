/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: 'var(--obsidian-950)',
          900: 'var(--obsidian-900)',
          800: 'var(--obsidian-800)',
          700: 'var(--obsidian-700)',
        },
        ember: {
          900: 'var(--ember-900)',
          700: 'var(--ember-700)',
          500: 'var(--ember-500)',
          300: 'var(--ember-300)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        danger: {
          500: 'var(--danger-500)',
        },
        success: {
          500: 'var(--success-500)',
        },
        cobalt: {
          500: 'var(--cobalt-500)',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
