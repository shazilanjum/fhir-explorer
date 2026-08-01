/**
 * The search instrument panel.
 *
 * Parameters come from the server's own `CapabilityStatement` — name, FHIR
 * search type, and documentation — so the form is correct on any server, and
 * each row gets an editor appropriate to its type. When a server advertises
 * nothing for this resource type we fall back to a small static list so the
 * form is never empty.
 */

import { useMemo, useState } from 'react';
import { Popover } from '@base-ui-components/react/popover';
import { commonSearchParams } from '../fhir/display';
import {
  buildQuery,
  formatParamDocumentation,
  parseQuery,
  serverSearchParams,
  type ParamValue,
  type ServerSearchParam,
} from '../fhir/searchParams';
import { useCapabilityStatement } from '../hooks/useFhir';
import { useServer } from '../context/ServerContext';
import { ParamEditor } from './ParamEditor';

/** Result-shaping params worth offering even if unadvertised. */
const ALWAYS_AVAILABLE: ServerSearchParam[] = [
  { name: '_id', type: 'token', documentation: 'Logical id of this artifact' },
  { name: '_lastUpdated', type: 'date', documentation: 'When the resource version last changed' },
  { name: '_count', type: 'number', documentation: 'Number of results per page' },
  { name: '_sort', type: 'string', documentation: 'Sort order — prefix a field with - to reverse' },
];

function mergeParams(
  fromServer: ServerSearchParam[],
  resourceType: string,
): { params: ServerSearchParam[]; fromCapability: boolean } {
  if (fromServer.length > 0) {
    const names = new Set(fromServer.map((p) => p.name));
    const extras = ALWAYS_AVAILABLE.filter((p) => !names.has(p.name));
    return { params: [...fromServer, ...extras], fromCapability: true };
  }
  // No CapabilityStatement data — fall back to the built-in guesses.
  const fallbackNames = commonSearchParams(resourceType);
  const guessed: ServerSearchParam[] = fallbackNames.map((name) => {
    const known = ALWAYS_AVAILABLE.find((p) => p.name === name);
    return known ?? { name, type: 'string' };
  });
  const names = new Set(guessed.map((p) => p.name));
  return {
    params: [...guessed, ...ALWAYS_AVAILABLE.filter((p) => !names.has(p.name))],
    fromCapability: false,
  };
}

export function SearchParamForm({
  resourceType,
  initialParams,
  isRunning,
  onSubmit,
}: {
  resourceType: string;
  initialParams: Record<string, string>;
  isRunning: boolean;
  onSubmit: (params: Record<string, string>) => void;
}) {
  const { baseUrl, token } = useServer();
  const capability = useCapabilityStatement(baseUrl, token);

  const { params: available, fromCapability } = useMemo(
    () => mergeParams(serverSearchParams(capability.data, resourceType), resourceType),
    [capability.data, resourceType],
  );

  const resourceTypes = useMemo(() => {
    const rest =
      capability.data?.rest?.find((r) => r.mode === 'server') ?? capability.data?.rest?.[0];
    return [...new Set(rest?.resource?.map((r) => r.type) ?? [])].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [capability.data]);

  const byName = useMemo(() => new Map(available.map((p) => [p.name, p])), [available]);

  // Decoding depends on each param's *type*, which only arrives with the
  // CapabilityStatement — so derive it rather than snapshotting into state.
  // Otherwise a `date` param decoded during the first render (when it still
  // looks like a `string`) keeps its prefix glued to its value.
  const decoded = useMemo(
    () => parseQuery(available, initialParams),
    [available, initialParams],
  );
  // Only the user's edits live in state; they overlay the derived values.
  const [edits, setEdits] = useState<Record<string, ParamValue>>({});
  const valueFor = (name: string): ParamValue => edits[name] ?? decoded[name] ?? {};

  // Visible rows are likewise derived, with explicit user intent layered on.
  const derivedActive = useMemo(() => {
    const fromQuery = [...new Set(Object.keys(initialParams).map((k) => k.split(':')[0]))];
    if (fromQuery.length) return fromQuery;
    return commonSearchParams(resourceType)
      .filter((n) => !n.startsWith('_') && byName.has(n))
      .slice(0, 4);
  }, [initialParams, resourceType, byName]);

  const [added, setAdded] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const activeNames = useMemo(
    () => [...derivedActive.filter((n) => !removed.includes(n)), ...added],
    [derivedActive, added, removed],
  );

  const [pickerFilter, setPickerFilter] = useState('');

  const activeParams = activeNames.map(
    (name) => byName.get(name) ?? { name, type: 'string' as const },
  );

  const values = useMemo(() => {
    const merged: Record<string, ParamValue> = {};
    for (const name of activeNames) merged[name] = valueFor(name);
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNames, edits, decoded]);

  const addable = available.filter(
    (p) =>
      !activeNames.includes(p.name) &&
      (p.name.toLowerCase().includes(pickerFilter.toLowerCase()) ||
        (p.documentation ?? '').toLowerCase().includes(pickerFilter.toLowerCase())),
  );

  const setValue = (name: string, next: ParamValue) =>
    setEdits((prev) => ({ ...prev, [name]: next }));

  const addParam = (name: string) => {
    setRemoved((prev) => prev.filter((n) => n !== name));
    setAdded((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setPickerFilter('');
  };

  const removeParam = (name: string) => {
    setAdded((prev) => prev.filter((n) => n !== name));
    setRemoved((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setEdits((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(buildQuery(activeParams, values));
  };

  const reset = () => {
    setEdits({});
    setAdded([]);
    setRemoved([]);
    onSubmit({});
  };

  return (
    <form onSubmit={submit} className="card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
        <p className="label-mono">search</p>
        <p className="font-mono text-xs text-ink-3">
          {fromCapability
            ? `${available.length} params advertised by server`
            : 'server advertises none — using built-in defaults'}
        </p>
      </div>

      <div className="space-y-3 p-4">
        {activeParams.length === 0 && (
          <p className="text-sm text-ink-2">
            No parameters yet. Add one below, or search with none to list everything.
          </p>
        )}

        {activeParams.map((param) => {
          const hint = formatParamDocumentation(param.documentation, resourceType);
          return (
            <div key={param.name}>
              <div className="mb-1 flex items-baseline gap-2">
                <label className="label-mono normal-case" title={hint}>
                  {param.name}
                </label>
                <span className="rounded-pill bg-paper-3 px-1.5 font-mono text-xs text-ink-3">
                  {param.type}
                </span>
                <button
                  type="button"
                  onClick={() => removeParam(param.name)}
                  className="ml-auto rounded-pill p-1 text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
                  aria-label={`Remove ${param.name}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="5" x2="19" y2="19" />
                    <line x1="19" y1="5" x2="5" y2="19" />
                  </svg>
                </button>
              </div>
              <ParamEditor
                param={param}
                value={valueFor(param.name)}
                resourceTypes={resourceTypes}
                onChange={(next) => setValue(param.name, next)}
              />
              {hint && (
                <p
                  className="mt-1 line-clamp-2 text-xs leading-snug text-ink-3"
                  title={hint}
                >
                  {hint}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-rule px-4 py-3">
        <button type="submit" disabled={isRunning} className="btn">
          {isRunning ? 'Searching…' : 'Search'}
        </button>
        <button type="button" onClick={reset} className="btn btn--soft">
          Clear
        </button>

        {/* Add-parameter picker, listing what the server actually supports. */}
        <Popover.Root onOpenChange={(open) => open && setPickerFilter('')}>
          <Popover.Trigger className="btn btn--soft ml-auto">+ Add parameter</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={6} align="end" className="z-50">
              <Popover.Popup className="flex max-h-80 w-[min(92vw,24rem)] flex-col rounded-card bg-paper p-2 shadow-pop ring-[1.5px] ring-rule outline-none">
                <input
                  autoFocus
                  value={pickerFilter}
                  onChange={(e) => setPickerFilter(e.target.value)}
                  placeholder="filter parameters…"
                  className="mb-2 w-full rounded-input border-[1.5px] border-rule bg-paper px-2.5 py-1.5 font-mono text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent-deep"
                />
                <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
                  {addable.length === 0 && (
                    <li className="px-2 py-3 text-center font-mono text-xs text-ink-3">
                      {pickerFilter ? 'no match' : 'all parameters added'}
                    </li>
                  )}
                  {addable.slice(0, 60).map((p) => {
                    const hint = formatParamDocumentation(p.documentation, resourceType);
                    return (
                      <li key={p.name}>
                        <Popover.Close
                          onClick={() => addParam(p.name)}
                          className="flex w-full flex-col items-start gap-0.5 rounded-input px-2 py-1.5 text-left transition-colors hover:bg-paper-3"
                        >
                          <span className="flex w-full items-baseline gap-2">
                            <span className="font-mono text-sm text-ink">{p.name}</span>
                            <span className="ml-auto shrink-0 font-mono text-xs text-ink-3">
                              {p.type}
                            </span>
                          </span>
                          {hint && (
                            <span className="line-clamp-1 text-xs leading-snug text-ink-3">
                              {hint}
                            </span>
                          )}
                        </Popover.Close>
                      </li>
                    );
                  })}
                </ul>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </form>
  );
}
