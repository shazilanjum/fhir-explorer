/**
 * The request inspector — a slide-out log of every FHIR call the app has made,
 * with a runnable `curl` per row. Opens on ⌘⇧I / Ctrl+Shift+I, or via the
 * `request-inspector:open` event so a toolbar button can trigger it.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { toast } from 'sonner';
import {
  formatBytes,
  requestLog,
  toCurl,
  type RequestLogEntry,
} from '../fhir/requestLog';

const OPEN_EVENT = 'request-inspector:open';

export function openRequestInspector() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Subscribe to the request log from React. */
export function useRequestLog(): RequestLogEntry[] {
  return useSyncExternalStore(requestLog.subscribe, requestLog.getSnapshot);
}

function statusTone(entry: RequestLogEntry): string {
  if (entry.errorKind === 'network') return 'text-danger';
  if (entry.status === undefined) return 'text-ink-3';
  if (entry.status >= 500) return 'text-danger';
  if (entry.status >= 400) return 'text-danger';
  if (entry.status >= 300) return 'text-accent-text';
  return 'text-accent-text';
}

/** Show the path + query, not the whole absolute URL — the base is constant. */
function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

function Row({ entry }: { entry: RequestLogEntry }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toCurl(entry));
      toast.success('curl copied', {
        description: entry.usedToken ? 'Token emitted as $FHIR_TOKEN' : undefined,
      });
    } catch {
      toast.error('Could not access the clipboard');
    }
  };

  return (
    <li className="border-b border-rule last:border-0">
      <div className="flex items-start gap-3 px-4 py-2.5">
        <span className="w-10 shrink-0 font-mono text-xs font-medium text-ink-2">
          {entry.method}
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-all font-mono text-xs text-ink" title={entry.url}>
            {shortenUrl(entry.url)}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 font-mono text-xs text-ink-3">
            <span className={statusTone(entry)}>
              {entry.errorKind === 'network'
                ? 'network / CORS'
                : `${entry.status ?? '—'} ${entry.statusText ?? ''}`.trim()}
            </span>
            <span>{entry.durationMs} ms</span>
            <span>{formatBytes(entry.bytes)}</span>
            {entry.usedToken && <span className="text-accent-text">auth</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="btn btn--soft shrink-0 !px-2.5 !py-1 !font-mono !text-xs"
        >
          curl
        </button>
      </div>
    </li>
  );
}

export function RequestInspector() {
  const [open, setOpen] = useState(false);
  const entries = useRequestLog();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘⇧I / Ctrl+Shift+I — mirrors a browser devtools reflex.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/30 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed right-0 top-0 z-50 flex h-full w-[min(94vw,34rem)] flex-col border-l border-rule bg-paper shadow-pop outline-none transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full">
          <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <div>
              <p className="label-mono">requests</p>
              <p className="mt-0.5 font-mono text-xs text-ink-3">
                {entries.length} recorded this session
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => requestLog.clear()}
                disabled={entries.length === 0}
                className="btn btn--soft !px-3 !py-1 !text-xs"
              >
                Clear
              </button>
              <Dialog.Close className="btn btn--soft !px-3 !py-1 !text-xs">Close</Dialog.Close>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <p className="text-sm text-ink-2">
                No requests yet. Run a search and they'll appear here, newest first.
              </p>
            </div>
          ) : (
            <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {entries.map((entry) => (
                <Row key={entry.id} entry={entry} />
              ))}
            </ul>
          )}

          <p className="border-t border-rule px-4 py-2.5 font-mono text-xs text-ink-3">
            curl uses <span className="text-ink-2">$FHIR_TOKEN</span> rather than your real token
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
