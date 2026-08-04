/**
 * Left rail: the resource types the server advertises, filterable, plus the
 * session's recent searches. Selection is marked with an accent rule + ink,
 * not a heavy fill (accent stays a signal).
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useServer } from '../context/ServerContext';
import { useCapabilityStatement } from '../hooks/useFhir';
import { Skeleton } from './ui/primitives';

function useResourceTypes(): string[] {
  const { baseUrl, token } = useServer();
  const { data } = useCapabilityStatement(baseUrl, token);
  return useMemo(() => {
    const rest = data?.rest?.find((r) => r.mode === 'server') ?? data?.rest?.[0];
    const types = rest?.resource?.map((r) => r.type) ?? [];
    return [...new Set(types)].sort((a, b) => a.localeCompare(b));
  }, [data]);
}

export function ResourceSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { baseUrl, token, history } = useServer();
  const { resourceType } = useParams();
  const navigate = useNavigate();
  const capability = useCapabilityStatement(baseUrl, token);
  const types = useResourceTypes();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    () => types.filter((t) => t.toLowerCase().includes(filter.toLowerCase())),
    [types, filter],
  );

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col bg-paper">
      <div className="border-b border-rule p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="label-mono">resources</span>
          {capability.isSuccess && (
            <span className="font-mono text-xs text-ink-3">{types.length}</span>
          )}
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          className="w-full rounded-pill border-[1.5px] border-rule bg-paper px-3 py-1.5 font-mono text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent-deep focus:ring-2 focus:ring-focus/30"
        />
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-2">
        {capability.isLoading && (
          <div className="space-y-1.5 p-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        )}

        {capability.isError && (
          <p className="px-2 py-4 text-sm text-ink-2">
            Connect to a server to browse its resource types.
          </p>
        )}

        {capability.isSuccess && filtered.length === 0 && (
          <p className="px-2 py-4 font-mono text-sm text-ink-2">no match for “{filter}”</p>
        )}

        <ul>
          {filtered.map((type) => {
            const active = type === resourceType;
            return (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => go(`/explore/${type}`)}
                  className={`w-full truncate rounded-pill px-3 py-1.5 text-left font-mono text-sm transition-colors ${
                    active
                      ? 'bg-accent font-semibold text-accent-ink shadow-[0_2px_0_0_var(--color-accent-deep)]'
                      : 'text-ink-2 hover:bg-paper-3 hover:text-ink'
                  }`}
                >
                  {type}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {history.length > 0 && (
        <div className="border-t border-rule p-2">
          <p className="label-mono px-2 pb-1">recent</p>
          <ul className="scrollbar-thin max-h-48 space-y-0.5 overflow-y-auto">
            {history.map((h) => {
              const q = new URLSearchParams(h.params).toString();
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => go(`/explore/${h.resourceType}${q ? `?${q}` : ''}`)}
                    className="w-full truncate rounded-pill px-3 py-1 text-left font-mono text-xs text-ink-2 transition-colors hover:bg-cyan-weak hover:text-link"
                    title={q || 'no parameters'}
                  >
                    <span className="text-ink">{h.resourceType}</span>
                    {q ? ` · ${q}` : ''}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
