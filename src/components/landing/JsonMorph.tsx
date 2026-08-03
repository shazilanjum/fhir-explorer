/**
 * The product's whole thesis, autoplaying on a loop: the same real Observation
 * shown as raw JSON on the left, while on the right its code and reference
 * repeatedly fly into their resolved positions via Motion's shared-layout
 * `layoutId` transition (a highlighted token in the JSON and a matching token
 * in the resolved card share an id, so Motion animates between their screen
 * positions — it's a real move, not a crossfade).
 *
 * Earlier this was gated behind scroll-into-view, which left it stuck on
 * "scroll to resolve" and feeling broken. It now plays by itself the moment
 * it mounts, and keeps looping, so the section is always alive.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { InstrumentView } from '../instruments';
import { Skeleton } from '../ui/primitives';
import { extractReferences } from '../../fhir/references';
import { formatCodeableConcept } from '../../fhir/display';
import { useHeartRateExample } from '../../hooks/useHeroVitals';
import type { Observation } from '../../fhir/types';

const SPRING = { type: 'spring' as const, bounce: 0.18, duration: 0.8 };

function trimmedJson(resource: Observation) {
  return {
    resourceType: resource.resourceType,
    id: resource.id,
    status: resource.status,
    code: resource.code,
    subject: resource.subject,
    valueQuantity: resource.valueQuantity,
  };
}

/** Pretty-print JSON as text with a couple of exact substrings lifted into
 *  `motion.span`s that carry a shared `layoutId`. */
function renderHighlighted(
  json: string,
  highlights: { needle: string; layoutId: string }[],
): ReactNode[] {
  const matches = highlights
    .map((h) => {
      const start = json.indexOf(h.needle);
      return start === -1 ? null : { start, end: start + h.needle.length, layoutId: h.layoutId };
    })
    .filter((m): m is { start: number; end: number; layoutId: string } => !!m)
    .sort((a, b) => a.start - b.start);

  const out: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) out.push(<span key={`t${i}`}>{json.slice(cursor, m.start)}</span>);
    out.push(
      <motion.span
        key={m.layoutId}
        layoutId={m.layoutId}
        transition={SPRING}
        className="rounded bg-accent-weak px-0.5 text-accent-text"
      >
        {json.slice(m.start, m.end)}
      </motion.span>,
    );
    cursor = m.end;
  });
  out.push(<span key="tail">{json.slice(cursor)}</span>);
  return out;
}

export function JsonMorph() {
  const { data: vital, isLoading } = useHeartRateExample();
  const reducedMotion = useReducedMotion();
  const [resolved, setResolved] = useState(false);

  // Autoplay + loop. No scroll gate — the animation drives itself, holding on
  // the resolved state, briefly returning, then flying in again.
  useEffect(() => {
    if (reducedMotion) {
      setResolved(true);
      return;
    }
    let active = true;
    let timer: number;
    const step = (show: boolean) => {
      if (!active) return;
      setResolved(show);
      timer = window.setTimeout(() => step(!show), show ? 3600 : 650);
    };
    timer = window.setTimeout(() => step(true), 500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [reducedMotion]);

  if (isLoading || !vital) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { resource, instrument } = vital;
  const codeText = formatCodeableConcept(resource.code) ?? resource.code?.coding?.[0]?.code ?? '—';
  const rawCode = resource.code?.coding?.[0]?.code;
  const reference = extractReferences(resource, '')[0];
  const json = JSON.stringify(trimmedJson(resource), null, 2);

  const highlights = [
    ...(rawCode ? [{ needle: `"${rawCode}"`, layoutId: 'morph-code' }] : []),
    ...(reference?.raw ? [{ needle: `"${reference.raw}"`, layoutId: 'morph-ref' }] : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center">
      <LayoutGroup id="json-morph">
        <div>
          <p className="label-mono mb-2">what the server sends</p>
          <pre
            className="scrollbar-thin overflow-auto rounded-card bg-code p-4 font-mono text-xs leading-relaxed text-code-ink"
          >
            <code>{renderHighlighted(json, highlights)}</code>
          </pre>
        </div>

        <div>
          <p className="label-mono mb-2">what you read</p>
          <div className="card flex min-h-[200px] flex-col justify-center px-5 py-4">
            {resolved ? (
              <div className="space-y-3">
                <motion.p
                  layoutId={rawCode ? 'morph-code' : undefined}
                  transition={SPRING}
                  className="font-display text-lg font-medium text-ink"
                >
                  {codeText}
                </motion.p>

                {instrument && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                  >
                    <InstrumentView instrument={instrument} />
                  </motion.div>
                )}

                {reference?.raw && (
                  <motion.div
                    layoutId="morph-ref"
                    transition={SPRING}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-accent-weak px-2.5 py-1 font-mono text-xs text-ink-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-deep" />
                    {reference.raw}
                    <span className="text-ink-3">— a graph edge, not a string</span>
                  </motion.div>
                )}
              </div>
            ) : (
              <p className="text-center font-mono text-xs text-ink-3">· · ·</p>
            )}
          </div>
        </div>
      </LayoutGroup>
    </div>
  );
}
