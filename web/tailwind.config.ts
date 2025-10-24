import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        muted: 'var(--fg-muted)',
        panel: 'var(--panel)',
        panelBg: 'var(--panel-bg)',
        codeBg: 'var(--code-bg)',
        cardBg: 'var(--card-bg)',
        bgElev2: 'var(--bg-elev2)',
        inputBg: 'var(--input-bg)',
        line: 'var(--line)',
        ring: 'var(--ring)',
        accent: 'var(--accent)',
        accentContrast: 'var(--accent-contrast)',
        link: 'var(--link)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        err: 'var(--err)'
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)']
      }
    }
  },
  plugins: []
} satisfies Config

