/**
 * One real resource, taken apart — as an auto-advancing player rather than a
 * scroll-scrubbed section. The four stages (raw JSON → coding resolved →
 * reference as a graph edge → finished instrument) cycle on a timer, are
 * always on screen, and can be jumped to by clicking a stage tab.
 *
 * The earlier version drove this off `useScroll` inside a 320vh sticky
 * container; off-screen scroll positions left it rendering nothing (a big
 * empty band). This is self-playing and always shows exactly one stage.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { InstrumentView } from '../instruments';
import { Skeleton } from '../ui/primitives';
import { codeSystemLabel } from '../../fhir/codings';
import { extractReferences } from '../../fhir/references';
import { formatCodeableConcept } from '../../fhir/display';
import { useHeartRateExample } from '../../hooks/useHeroVitals';
import type { Observation } from '../../fhir/types';

const STAGES = ['raw json', 'coding resolved', 'reference → edge', 'instrument'];
const DWELL_MS = 2600;

function trimmedJson(resource: Observation) {
  return {
    resourceType: resource.resourceType,
    id: resource.id,
    code: resource.code,
    subject: resource.subject,
    valueQuantity: resource.valueQuantity,
  };
}

export function ResourceDissection() {
  const { data: vital, isLoading } = useHeartRateExample();
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  // Pauses the autoplay once the visitor takes manual control.
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (reducedMotion || manual) return;
    const id = window.setInterval(() => setStage((s) => (s + 1) % STAGES.length), DWELL_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion, manual]);

  if (isLoading || !vital) return <Skeleton className="h-96 w-full" />;

  const { resource, instrument } = vital;
  const coding = resource.code?.coding?.[0];
  const reference = extractReferences(resource, '')[0];

  const jump = (i: number) => {
    setManual(true);
    setStage(i);
  };

  const stageContent = [
    // 0 — raw JSON
    <pre
      key="json"
      className="scrollbar-thin h-full overflow-auto rounded-card bg-code p-4 font-mono text-xs leading-relaxed text-code-ink"
    >
      <code>{JSON.stringify(trimmedJson(resource), null, 2)}</code>
    </pre>,

    // 1 — coding resolved
    <div key="coding" className="card flex h-full flex-col justify-center gap-2 px-6 py-5">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-accent-weak px-2 py-0.5 font-mono text-xs text-accent-text">
        {codeSystemLabel(coding?.system)}
      </span>
      <p className="font-mono text-sm text-ink-3">{coding?.code}</p>
      <p className="font-display text-2xl font-medium text-ink">
        {formatCodeableConcept(resource.code) ?? '—'}
      </p>
      <p className="text-xs text-ink-3">resolved via CodeSystem/$lookup</p>
    </div>,

    // 2 — reference becomes a graph edge
    <div key="graph" className="card flex h-full items-center justify-center px-6 py-5">
      <svg viewBox="0 0 340 140" className="h-full w-full max-w-sm">
        <motion.line
          x1="95"
          y1="70"
          x2="245"
          y2="70"
          stroke="var(--color-accent-deep)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <g transform="translate(15, 50)">
          <rect width="90" height="40" rx="8" fill="var(--color-accent-weak)" stroke="var(--color-accent-deep)" strokeWidth="1.5" />
          <text x="45" y="24" textAnchor="middle" className="fill-[var(--color-ink)]" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            Observation
          </text>
        </g>
        <g transform="translate(235, 50)">
          <rect width="90" height="40" rx="8" fill="var(--color-paper)" stroke="var(--color-rule)" strokeWidth="1.5" />
          <text x="45" y="24" textAnchor="middle" className="fill-[var(--color-ink)]" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            {reference?.resourceType ?? 'Patient'}
          </text>
        </g>
      </svg>
    </div>,

    // 3 — finished instrument
    <div key="instrument" className="card flex h-full flex-col justify-center px-6 py-5">
      <InstrumentView instrument={instrument} />
    </div>,
  ];

  return (
    <div>
      {/* Stage tabs — also a progress readout of the autoplay. */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {STAGES.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => jump(i)}
            aria-pressed={stage === i}
            className={`rounded-pill px-3 py-1 font-mono text-xs transition-colors ${
              stage === i
                ? 'bg-accent text-accent-ink'
                : 'bg-paper-3 text-ink-3 hover:text-ink'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="relative mx-auto h-72 max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {stageContent[stage]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
