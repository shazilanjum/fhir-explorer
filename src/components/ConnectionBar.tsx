/**
 * Top command bar: wordmark, base-URL field, preset picker, and a live
 * connection readout. Connecting fetches the server's CapabilityStatement.
 * Success is silent (a jade dot + server identity); only failures toast.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useServer } from '../context/ServerContext';
import { useCapabilityStatement } from '../hooks/useFhir';
import { ExperienceSettings } from './ExperienceSettings';
import { openCommandPalette } from './CommandPalette';
import { openRequestInspector, useRequestLog } from './RequestInspector';
import { PresetSelect } from './ui/PresetSelect';
import { TokenControl } from './ui/TokenControl';
import { DelayedSpinner } from './ui/primitives';

export function ConnectionBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { baseUrl, token, connect } = useServer();
  const [draft, setDraft] = useState(baseUrl);
  const capability = useCapabilityStatement(baseUrl, token);

  const dirty = draft.trim().replace(/\/+$/, '') !== baseUrl;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.trim()) connect(draft);
  };

  // Failures toast; success stays silent (the live dot carries it).
  const lastToast = useRef<string>('');
  useEffect(() => {
    if (capability.isError) {
      const key = `err:${baseUrl}`;
      if (lastToast.current !== key) {
        lastToast.current = key;
        toast.error('Could not connect', { description: baseUrl });
      }
    } else if (capability.isSuccess) {
      lastToast.current = `ok:${baseUrl}`;
    }
  }, [capability.isSuccess, capability.isError, baseUrl]);

  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  return (
    <header className="border-b border-rule bg-paper">
      <form onSubmit={submit} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-pill p-1.5 text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink md:hidden"
          aria-label="Toggle resource list"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Wordmark — the dot is the character mark: pear, gently alive */}
        <Link to="/" className="flex items-center gap-2 text-sm text-ink">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent ring-2 ring-accent-deep/40"
            aria-hidden="true"
          />
          <span className="font-display font-bold tracking-tight">fhir</span>
          <span className="hidden font-display text-ink-3 sm:inline">explorer</span>
        </Link>

        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden items-center gap-2 rounded-pill border-[1.5px] border-rule bg-paper px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink sm:inline-flex"
        >
          <span>Jump to</span>
          <kbd className="rounded-pill bg-paper-3 px-1.5 py-0.5 font-mono text-xs text-ink-2">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>

        <div className="flex min-w-[240px] flex-1 items-center gap-2">
          <label htmlFor="base-url" className="sr-only">
            FHIR base URL
          </label>
          <input
            id="base-url"
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://hapi.fhir.org/baseR4"
            className="w-full rounded-input border-[1.5px] border-rule bg-paper px-3 py-1.5 font-mono text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent-deep focus:ring-2 focus:ring-focus/30"
          />
          <div className="hidden lg:block">
            <PresetSelect
              value={baseUrl}
              onSelect={(url) => {
                setDraft(url);
                connect(url);
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!draft.trim() || (!dirty && capability.isSuccess)}
            className="btn"
          >
            {dirty ? 'Connect' : 'Reconnect'}
          </button>
          <TokenControl />
          <RequestInspectorButton />
          <ExperienceSettings />
        </div>

        {/* Live connection readout */}
        <div className="flex w-full items-center gap-2 font-mono text-xs sm:w-auto">
          {capability.isLoading && (
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <DelayedSpinner className="h-3.5 w-3.5" /> connecting
            </span>
          )}
          {capability.isError && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger-weak px-2 py-0.5 text-danger">
              <span className="h-1.5 w-1.5 rounded-full bg-pop" /> connection failed
            </span>
          )}
        </div>
      </form>
    </header>
  );
}

/** Opens the request inspector, badged with the number of calls recorded. */
function RequestInspectorButton() {
  const entries = useRequestLog();
  return (
    <button
      type="button"
      onClick={openRequestInspector}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border-[1.5px] border-rule bg-paper px-3 py-1.5 font-mono text-xs text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      aria-label={`Request inspector — ${entries.length} recorded`}
      title="Request inspector (⌘⇧I)"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
      <span className="tabular-nums">{entries.length}</span>
    </button>
  );
}
