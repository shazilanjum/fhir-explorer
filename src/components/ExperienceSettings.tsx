/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * component: settings sheet · genre: playful · theme: locked multi-theme system
 * states: default · hover · focus · active · selected · disabled-ready · open · closed
 * loading/error: not applicable — preferences update synchronously with silent success
 * motion: transform + opacity only · reduced-motion: opacity-only · contrast: semantic-token pairs
 */

import { useRef } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  WELCOME_MODES,
  isWelcomeMode,
  useExperience,
  type WelcomeMode,
} from '../context/ExperienceContext';
import { THEMES, useTheme, type ThemeId } from '../context/ThemeContext';

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H10.4v-.1A1.7 1.7 0 0 0 10 19.8a1.7 1.7 0 0 0-1-.4 1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-3.2h.1A1.7 1.7 0 0 0 4.2 10a1.7 1.7 0 0 0 .4-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.06 4.2l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h3.2v.1A1.7 1.7 0 0 0 14 4.2a1.7 1.7 0 0 0 1 .4 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 9c.08.38.29.73.6 1 .3.24.7.39 1.1.4h.1v3.2h-.1c-.4.01-.8.16-1.1.4-.31.27-.52.62-.6 1Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m4 10 4 4 8-9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="m4 4 12 12M16 4 4 16" />
    </svg>
  );
}

export function ExperienceSettings() {
  const { welcomeMode, setWelcomeMode } = useExperience();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const requestedMode = new URLSearchParams(location.search).get('mode');
  const activeWelcomeMode =
    location.pathname === '/' && isWelcomeMode(requestedMode) ? requestedMode : welcomeMode;

  function chooseWelcomeMode(mode: WelcomeMode) {
    setWelcomeMode(mode);
    if (location.pathname === '/') {
      navigate(mode === 'metro' ? '/?mode=metro' : '/', { replace: true });
    }
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger aria-label="Experience settings" title="Experience settings" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-rule bg-paper text-sm text-ink-2 outline-none transition-colors hover:bg-paper-3 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus active:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-[0.55]">
        <SettingsIcon />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/30 opacity-100 transition-opacity duration-[var(--dur-sheet)] ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:duration-150" />
        <Dialog.Popup
          initialFocus={firstChoiceRef}
          className="fixed right-0 top-0 z-50 flex h-svh w-full max-w-[28rem] flex-col border-l border-rule bg-paper text-ink shadow-pop outline-none transition-[transform,opacity] duration-[var(--dur-sheet)] ease-out data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full motion-reduce:transform-none motion-reduce:transition-opacity motion-reduce:duration-150 motion-reduce:data-[ending-style]:opacity-0 motion-reduce:data-[starting-style]:opacity-0"
        >
          <header className="flex items-start justify-between gap-5 border-b border-rule px-5 pb-5 pt-6 sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-2xl font-bold tracking-tight">Experience settings</Dialog.Title>
              <Dialog.Description className="mt-1 max-w-[48ch] text-sm leading-relaxed text-ink-2">
                Choose how the explorer welcomes you and how every surface feels.
              </Dialog.Description>
            </div>
            <Dialog.Close className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-rule bg-paper text-ink-2 outline-none transition-colors hover:bg-paper-3 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus active:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-[0.55]" aria-label="Close experience settings">
              <CloseIcon />
            </Dialog.Close>
          </header>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            <section aria-labelledby="welcome-setting-title">
              <div>
                <h2 id="welcome-setting-title" className="text-lg font-bold">Welcome page</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">This becomes the default whenever you open the homepage.</p>
              </div>
              <div className="mt-4 grid gap-3">
                {WELCOME_MODES.map((mode, index) => {
                  const selected = activeWelcomeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      ref={index === 0 ? firstChoiceRef : undefined}
                      type="button"
                      onClick={() => chooseWelcomeMode(mode.id)}
                      aria-pressed={selected}
                      className={`flex min-h-20 w-full items-center gap-4 rounded-card border px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:bg-paper-3 disabled:cursor-not-allowed disabled:opacity-[0.55] ${
                        selected ? 'border-ink bg-paper-2' : 'border-rule bg-paper hover:bg-paper-3'
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border font-mono text-xs font-bold ${selected ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper-2 text-ink-2'}`} aria-hidden="true">
                        {mode.id === 'metro' ? 'M' : 'O'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display font-bold">{mode.label}</span>
                        <span className="mt-0.5 block text-sm leading-snug text-ink-2">{mode.note}</span>
                      </span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border ${selected ? 'border-accent-deep bg-accent text-accent-ink' : 'border-rule text-transparent'}`} aria-hidden="true">
                        <CheckIcon />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8 border-t border-rule pt-7" aria-labelledby="theme-setting-title">
              <div>
                <h2 id="theme-setting-title" className="text-lg font-bold">Theme</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">The whole explorer updates immediately and remembers your choice.</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {THEMES.map((item) => {
                  const selected = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTheme(item.id as ThemeId)}
                      aria-pressed={selected}
                      className={`relative min-h-24 rounded-card border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:bg-paper-3 disabled:cursor-not-allowed disabled:opacity-[0.55] ${
                        selected ? 'border-ink bg-paper-2' : 'border-rule bg-paper hover:bg-paper-3'
                      }`}
                    >
                      <span className="mb-4 block h-3 w-3 rounded-pill bg-accent ring-2 ring-accent-deep/40" aria-hidden="true" />
                      <span className="block font-display font-bold">{item.label}</span>
                      <span className="mt-1 block font-mono text-xs leading-snug text-ink-3">{item.note}</span>
                      {selected && (
                        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-pill bg-ink text-paper" aria-hidden="true">
                          <CheckIcon />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <p className="border-t border-rule px-5 py-4 font-mono text-xs text-ink-3 sm:px-6" aria-live="polite">
            Changes save automatically on this device.
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
