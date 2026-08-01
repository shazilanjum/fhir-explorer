/**
 * Theme selection. All four themes ship together and switch at runtime by
 * setting `data-theme` on <html>; every expressive token resolves from that
 * attribute, so components never branch on the theme themselves.
 *
 * The choice persists to `localStorage` — a UI preference, not a secret, so it
 * survives across sessions (unlike the server URL/token, which live in
 * sessionStorage). `index.html` carries a tiny inline script that reads the
 * same key before first paint, so a reload never flashes the wrong theme.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { initialString, writeStorage } from '../lib/storage';

export const THEMES = [
  { id: 'hum', label: 'Hum', note: 'cream · playful' },
  { id: 'lumen', label: 'Lumen', note: 'night foundry · brass' },
  { id: 'manifesto', label: 'Manifesto', note: 'bone · signal red' },
  { id: 'terminal', label: 'Terminal', note: 'phosphor · monospace' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'hum';

/** Exported so index.html's boot script and this module agree on the key. */
export const THEME_STORAGE_KEY = 'theme';

function isThemeId(value: string | null): value is ThemeId {
  return !!value && THEMES.some((t) => t.id === value);
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = initialString(localStorage, THEME_STORAGE_KEY, DEFAULT_THEME);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  });

  // The attribute lives on <html> so the tokens apply to portalled content
  // (command palette, popovers, toasts) as well as the app tree. The boot
  // script in index.html already set it once before first paint; this just
  // keeps it in sync as the user changes theme.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    writeStorage(localStorage, THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => setThemeState(next), []);
  /** Advance to the next theme in THEMES order, wrapping at the end. */
  const toggleTheme = useCallback(
    () =>
      setThemeState((current) => {
        const i = THEMES.findIndex((t) => t.id === current);
        return THEMES[(i + 1) % THEMES.length].id;
      }),
    [],
  );

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
