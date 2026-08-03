/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Every value references a token in src/tokens.css so that file stays the
    // single source of truth. Theme: Hum (playful, multi-accent).
    extend: {
      colors: {
        paper: {
          DEFAULT: 'var(--color-paper)',
          2: 'var(--color-paper-2)',
          3: 'var(--color-paper-3)',
        },
        code: {
          DEFAULT: 'var(--color-code-bg)',
          ink: 'var(--color-code-ink)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          2: 'var(--color-ink-2)',
          3: 'var(--color-ink-3)',
        },
        rule: {
          DEFAULT: 'var(--color-rule)',
          2: 'var(--color-rule-2)',
        },
        // Pear — primary action, in-range, highlight bands.
        accent: {
          DEFAULT: 'var(--color-accent)',
          deep: 'var(--color-accent-deep)',
          hover: 'var(--color-accent-hover)',
          ink: 'var(--color-accent-ink)',
          weak: 'var(--color-accent-weak)',
          text: 'var(--color-accent-text)',
        },
        // Sky-cyan — links and references.
        cyan: {
          DEFAULT: 'var(--color-accent-2)',
          weak: 'var(--color-accent-2-weak)',
        },
        link: {
          DEFAULT: 'var(--color-link)',
          hover: 'var(--color-link-hover)',
        },
        // Coral — the single high-energy moment.
        pop: {
          DEFAULT: 'var(--color-accent-3)',
          weak: 'var(--color-accent-3-weak)',
        },
        focus: 'var(--color-focus)',
        danger: {
          DEFAULT: 'var(--color-danger)',
          ink: 'var(--color-danger-ink)',
          weak: 'var(--color-danger-weak)',
        },
        mint: 'var(--color-mint)',
        lavender: 'var(--color-lavender)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        input: 'var(--radius-input)',
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        pop: 'var(--shadow-pop)',
      },
      transitionTimingFunction: {
        press: 'var(--ease-press)',
        spring: 'var(--ease-spring)',
        out: 'var(--ease-out)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
}
