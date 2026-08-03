/**
 * The hero's proof-of-life: real instrument cards fed by real Observations
 * fetched from the public HAPI server on load. The displayed numbers never
 * move on their own — only the chrome around them (entrance, a slow glow) is
 * animated, so "living" never slides into "invented."
 */

import { motion, useReducedMotion } from 'motion/react';
import { InstrumentView } from '../instruments';
import { Skeleton } from '../ui/primitives';
import { useHeroVitals } from '../../hooks/useHeroVitals';

export function LivingInstruments() {
  const { vitals, isLoading, settled } = useHeroVitals();
  const reducedMotion = useReducedMotion();

  if (settled && vitals.length === 0) {
    return (
      <div className="card px-5 py-6 text-center">
        <p className="text-sm text-ink-2">
          Couldn't reach the demo server just now — the app itself doesn't depend on this.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isLoading &&
        vitals.length === 0 &&
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}

      {vitals.map((vital, i) => (
        <motion.div
          key={vital.title}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reducedMotion
              ? { duration: 0.15 }
              : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.12 }
          }
          className="card relative overflow-hidden px-5 py-4"
        >
          {/* A slow, decorative breathing glow behind the card — never touches
              the value itself. */}
          {!reducedMotion && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-8 rounded-full bg-accent-weak blur-2xl"
              animate={{ opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <p className="relative label-mono mb-2">{vital.title}</p>
          <div className="relative">
            <InstrumentView instrument={vital.instrument} />
          </div>
        </motion.div>
      ))}

      <p className="pt-1 text-center font-mono text-xs text-ink-3">
        live from hapi.fhir.org — real records, fetched on load
      </p>
    </div>
  );
}
