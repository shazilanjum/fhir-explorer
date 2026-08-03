/**
 * The page's signature move: drag across four stops and the *entire* page
 * re-skins live — font, radius, shadow, and palette all move together, because
 * every one of them resolves from the same `data-theme` attribute this sets.
 *
 * Nothing here is a special "preview" — it calls the real `useTheme()`, so
 * scrubbing the landing page and scrubbing it from the app's own command bar
 * are the same action.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { THEMES, useTheme, type ThemeId } from '../../context/ThemeContext';

export function ThemeScrubber() {
  const { theme, setTheme } = useTheme();
  const [hovered, setHovered] = useState<ThemeId | null>(null);
  const index = THEMES.findIndex((t) => t.id === theme);
  const shown = hovered ?? theme;

  return (
    <div className="w-full max-w-xl">
      <div className="relative">
        {/* Track */}
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-rule" />
        {/* Filled portion, up to the active stop */}
        <motion.div
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-accent-deep"
          initial={false}
          animate={{ width: `${(index / (THEMES.length - 1)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <div className="relative flex items-center justify-between">
          {THEMES.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(t.id)}
              onBlur={() => setHovered(null)}
              aria-pressed={theme === t.id}
              className="group relative flex flex-col items-center gap-2 px-1 py-3 focus:outline-none"
            >
              <motion.span
                className={`h-3 w-3 rounded-full border-2 transition-colors ${
                  i <= index ? 'border-accent-deep bg-accent' : 'border-rule bg-paper'
                }`}
                animate={theme === t.id ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
              <span
                className={`font-mono text-xs uppercase tracking-wide transition-colors ${
                  theme === t.id ? 'text-ink' : 'text-ink-3 group-hover:text-ink-2'
                }`}
              >
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 text-center font-mono text-xs text-ink-3" aria-live="polite">
        {THEMES.find((t) => t.id === shown)?.note}
      </div>
    </div>
  );
}
