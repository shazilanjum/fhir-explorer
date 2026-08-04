/**
 * Time-travel across a resource's `_history`. Drag the scrubber and the version
 * changes in place; the diff against the previous version is listed, and the
 * changed leaf paths are highlighted.
 *
 * Opt-in: `_history` is an extra request and not every server keeps versions,
 * so this loads only when the visitor asks, and reports a missing history as a
 * server capability, not an error in the resource.
 */

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useServer } from '../context/ServerContext';
import { useResourceHistory } from '../hooks/useResourceHistory';
import { diffResources, type FieldChange } from '../fhir/diff';
import { DelayedSpinner } from './ui/primitives';

function ChangeRow({ change }: { change: FieldChange }) {
  const tone =
    change.kind === 'added'
      ? 'text-accent-text'
      : change.kind === 'removed'
        ? 'text-danger'
        : 'text-ink';
  const mark = change.kind === 'added' ? '+' : change.kind === 'removed' ? '−' : '~';

  return (
    <div className="grid grid-cols-[1rem_1fr] gap-x-2 py-1 font-mono text-xs">
      <span className={tone}>{mark}</span>
      <div className="min-w-0">
        <p className="break-all text-ink-2">{change.path}</p>
        <p className="break-words">
          {change.kind === 'changed' ? (
            <>
              <span className="text-ink-3 line-through">{change.before}</span>{' '}
              <span className="text-ink-3">→</span> <span className="text-ink">{change.after}</span>
            </>
          ) : (
            <span className={tone}>{change.after ?? change.before}</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function VersionScrubber({
  resourceType,
  id,
}: {
  resourceType: string;
  id: string;
}) {
  const { baseUrl, token } = useServer();
  const [enabled, setEnabled] = useState(false);
  const history = useResourceHistory(baseUrl, resourceType, id, token, enabled);
  const versions = history.data ?? [];
  const [index, setIndex] = useState<number | null>(null);

  // Default the scrubber to the newest version once history arrives.
  const active = index ?? versions.length - 1;
  const current = versions[active];
  const previous = active > 0 ? versions[active - 1] : undefined;

  const changes = useMemo(
    () => (current && previous ? diffResources(previous.resource, current.resource) : []),
    [current, previous],
  );

  return (
    <div className="border-t border-rule px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label-mono">history</p>
        {!enabled ? (
          <button
            type="button"
            onClick={() => setEnabled(true)}
            className="btn btn--soft !px-3 !py-1 !text-xs"
          >
            load versions
          </button>
        ) : history.isLoading ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-2">
            <DelayedSpinner className="h-3 w-3" /> loading
          </span>
        ) : history.isError ? (
          <span className="font-mono text-xs text-ink-3">_history unsupported</span>
        ) : (
          <span className="font-mono text-xs text-ink-3">
            {versions.length} {versions.length === 1 ? 'version' : 'versions'}
          </span>
        )}
      </div>

      {enabled && history.isSuccess && versions.length > 0 && current && (
        <div className="mt-3">
          {/* Scrubber */}
          <div className="flex items-center gap-3">
            <span className="shrink-0 font-mono text-xs text-ink-3">
              v{current.versionId ?? active + 1}
            </span>
            <input
              type="range"
              min={0}
              max={versions.length - 1}
              value={active}
              onChange={(e) => setIndex(Number(e.target.value))}
              disabled={versions.length < 2}
              aria-label="Resource version"
              className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-pill bg-paper-3 accent-[var(--color-accent)]"
            />
            <span className="shrink-0 font-mono text-xs text-ink-3">
              {current.lastUpdated?.slice(0, 10) ?? '—'}
            </span>
          </div>

          {/* Diff vs previous */}
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3"
          >
            {!previous ? (
              <p className="font-mono text-xs text-ink-3">first version — nothing to compare.</p>
            ) : changes.length === 0 ? (
              <p className="font-mono text-xs text-ink-3">
                no field changes from v{previous.versionId ?? active} (metadata only).
              </p>
            ) : (
              <div className="scrollbar-thin max-h-64 overflow-y-auto rounded-card border border-rule p-2">
                <p className="mb-1 px-1 font-mono text-xs text-ink-3">
                  {changes.length} {changes.length === 1 ? 'change' : 'changes'} from v
                  {previous.versionId ?? active}
                </p>
                {changes.map((c) => (
                  <ChangeRow key={`${c.kind}-${c.path}`} change={c} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {enabled && history.isError && (
        <p className="mt-2 text-xs text-ink-2">
          This server didn't return version history for this resource. `_history` is optional —
          the resource may simply not be versioned here.
        </p>
      )}
    </div>
  );
}
