/**
 * ⌘K / Ctrl+K command palette. Fuzzy-jump to any of the server's resource
 * types, or re-run a recent search. Opens on the keyboard shortcut or on a
 * dispatched `command-palette:open` event (so a button can trigger it too).
 */

import { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useServer } from '../context/ServerContext';
import { useCapabilityStatement } from '../hooks/useFhir';

const OPEN_EVENT = 'command-palette:open';

/** Dispatch this from anywhere to open the palette. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { baseUrl, token, history } = useServer();
  const { data } = useCapabilityStatement(baseUrl, token);

  const resourceTypes = useMemo(() => {
    const rest = data?.rest?.find((r) => r.mode === 'server') ?? data?.rest?.[0];
    const types = rest?.resource?.map((r) => r.type) ?? [];
    return [...new Set(types)].sort((a, b) => a.localeCompare(b));
  }, [data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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

  const run = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const groupHeading =
    '[&_[cmdk-group-heading]]:label-mono [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2';
  const itemCls =
    'flex cursor-pointer items-center gap-2 rounded-pill px-3 py-1.5 font-mono text-sm text-ink data-[selected=true]:bg-accent data-[selected=true]:font-semibold data-[selected=true]:text-accent-ink';

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      loop
      overlayClassName="fixed inset-0 z-50 bg-ink/25 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-24 z-50 w-[min(92vw,560px)] -translate-x-1/2 overflow-hidden rounded-card bg-paper shadow-pop ring-[1.5px] ring-rule focus:outline-none"
    >
      <div className="flex items-center gap-2 border-b border-rule px-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <Command.Input
          autoFocus
          placeholder="Jump to a resource type or recent search…"
          className="w-full bg-transparent py-3 text-sm text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      <Command.List className="scrollbar-thin max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center font-mono text-sm text-ink-3">
          no matches
        </Command.Empty>

        {history.length > 0 && (
          <Command.Group heading="recent" className={groupHeading}>
            {history.slice(0, 6).map((h) => {
              const q = new URLSearchParams(h.params).toString();
              return (
                <Command.Item
                  key={h.id}
                  value={`recent ${h.resourceType} ${q}`}
                  onSelect={() => run(`/${h.resourceType}${q ? `?${q}` : ''}`)}
                  className={itemCls}
                >
                  <span className="font-medium">{h.resourceType}</span>
                  {q && <span className="truncate text-xs opacity-70">{q}</span>}
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        <Command.Group heading="resource types" className={groupHeading}>
          {resourceTypes.map((type) => (
            <Command.Item key={type} value={type} onSelect={() => run(`/${type}`)} className={itemCls}>
              {type}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
      <div className="flex items-center justify-end gap-3 border-t border-rule px-3 py-2 font-mono text-xs text-ink-3">
        <span>
          <kbd className="rounded-pill bg-paper-3 px-1.5">↑</kbd>{' '}
          <kbd className="rounded-pill bg-paper-3 px-1.5">↓</kbd> navigate
        </span>
        <span>
          <kbd className="rounded-pill bg-paper-3 px-1.5">↵</kbd> select
        </span>
        <span>
          <kbd className="rounded-pill bg-paper-3 px-1.5">esc</kbd> close
        </span>
      </div>
    </Command.Dialog>
  );
}
