/** A single search-result cell summarizing one resource. */

import { Fragment, useMemo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { summarizeResource } from '../fhir/display';
import { deriveInstrument, fieldsCoveredBy } from '../fhir/instruments';
import type { AnyResource } from '../fhir/types';
import { InstrumentView } from './instruments';
import { Badge } from './ui/primitives';

export function ResultCard({ resource, index = 0 }: { resource: AnyResource; index?: number }) {
  const summary = summarizeResource(resource);
  const to = resource.id ? `/explore/${resource.resourceType}/${resource.id}` : undefined;

  // A type-aware instrument replaces the fields it already communicates, so the
  // same value never shows up twice on one card.
  const instrument = useMemo(() => deriveInstrument(resource), [resource]);
  const fields = useMemo(() => {
    const covered = fieldsCoveredBy(instrument);
    return summary.fields.filter((f) => !covered.has(f.label));
  }, [summary.fields, instrument]);

  const inner = (
    <div className="card card--interactive group flex h-full flex-col px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <h3
          className="font-display text-md font-semibold leading-snug text-ink line-clamp-2"
          title={summary.title}
        >
          {summary.title}
        </h3>
        <Badge tone="cyan">{resource.resourceType}</Badge>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-xs text-ink-3">
          {resource.id ? `id · ${resource.id}` : resource.resourceType}
        </span>
        {to && (
          <span
            aria-hidden="true"
            className="shrink-0 font-mono text-xs text-ink-3 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-link"
          >
            →
          </span>
        )}
      </div>

      {instrument && (
        <div className="mt-3">
          <InstrumentView instrument={instrument} />
        </div>
      )}

      {fields.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {fields.map((f) => (
            <Fragment key={f.label}>
              <dt className="self-center font-mono text-xs uppercase tracking-wide text-ink-2">
                {f.label}
              </dt>
              <dd className="min-w-0 break-words text-ink" title={f.value}>
                {f.value}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.03 }}
    >
      {to ? (
        <Link
          to={to}
          className="block h-full rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.div>
  );
}
