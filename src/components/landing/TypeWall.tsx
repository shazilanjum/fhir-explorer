/**
 * Every resource type the demo server actually advertises, as a dense mono
 * grid — communicating breadth in one glance instead of a "146+" stat that
 * could just as easily be invented. Pulled live from the same
 * CapabilityStatement the app itself reads.
 */

import { motion, useReducedMotion } from 'motion/react';
import { useCapabilityStatement } from '../../hooks/useFhir';
import { DEFAULT_BASE_URL } from '../../context/ServerContext';
import { Skeleton } from '../ui/primitives';

// Stagger caps out after this many tiles so a 146-item grid still settles in
// well under a second, per the group-entrance rule (30–80ms/step, capped).
const STAGGER_CAP = 40;
const STEP_S = 0.012;

export function TypeWall() {
  const capability = useCapabilityStatement(DEFAULT_BASE_URL);
  const reducedMotion = useReducedMotion();

  const types = (() => {
    const rest =
      capability.data?.rest?.find((r) => r.mode === 'server') ?? capability.data?.rest?.[0];
    return [...new Set(rest?.resource?.map((r) => r.type) ?? [])].sort((a, b) =>
      a.localeCompare(b),
    );
  })();

  if (capability.isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
        {Array.from({ length: 21 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (capability.isError || types.length === 0) {
    return (
      <p className="text-center text-sm text-ink-2">
        Couldn't read the server's capabilities just now — it normally lists every resource type
        it supports here.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
        {types.map((type, i) => (
          <motion.div
            key={type}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: reducedMotion ? 0.15 : 0.28,
              delay: reducedMotion ? 0 : Math.min(i, STAGGER_CAP) * STEP_S,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="truncate rounded-input border-[1.5px] border-rule bg-paper px-2 py-1.5 text-center font-mono text-xs text-ink-2 transition-colors hover:border-accent-deep hover:text-ink"
            title={type}
          >
            {type}
          </motion.div>
        ))}
      </div>
      <p className="mt-4 text-center font-mono text-xs text-ink-3">
        {types.length} resource types, read live from {new URL(DEFAULT_BASE_URL).host}
      </p>
    </div>
  );
}
