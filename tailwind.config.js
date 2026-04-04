/** @type {import('tailwindcss').Config} */
export default {
  content: ['./popup.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Atkinson Hyperlegible', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        vault: {
          bg: 'var(--vault-bg)',
          canvas: 'var(--vault-canvas)',
          surface: 'var(--vault-surface)',
          raised: 'var(--vault-raised)',
          border: 'var(--vault-border)',
          'border-strong': 'var(--vault-border-strong)',
          text: 'var(--vault-text)',
          muted: 'var(--vault-muted)',
          subtle: 'var(--vault-subtle)',
          accent: 'var(--vault-accent)',
          'accent-hover': 'var(--vault-accent-hover)',
          'accent-muted': 'var(--vault-accent-muted)',
          'on-accent': 'var(--vault-on-accent)',
          danger: 'var(--vault-danger)',
          'danger-hover': 'var(--vault-danger-hover)',
          'danger-muted': 'var(--vault-danger-muted)',
          totp: 'var(--vault-totp)',
        },
      },
      boxShadow: {
        vault: 'var(--vault-shadow)',
        'vault-glow': 'var(--vault-glow)',
      },
    },
  },
  plugins: [],
};
