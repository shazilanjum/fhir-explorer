/**
 * A trend line for a series of Observation values. Pure SVG on a fixed
 * viewBox so it scales responsively without measuring the DOM.
 *
 * The current reading is marked so you can see where it sits in the series.
 */

import { formatNumber, type Instrument } from '../../fhir/instruments';
import type { SeriesPoint } from '../../hooks/useObservationSeries';

const W = 320;
const H = 56;
const PAD = 4;

export function Sparkline({
  points,
  unit,
  currentDate,
}: {
  points: SeriesPoint[];
  unit?: string;
  currentDate?: string;
}) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) * 0.1 || 1;

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
  const currentIndex = currentDate ? points.findIndex((p) => p.date === currentDate) : -1;
  const lastIndex = points.length - 1;
  const markIndex = currentIndex >= 0 ? currentIndex : lastIndex;

  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-xs text-ink-3">
        <span>{points.length} readings</span>
        <span>
          {formatNumber(min)}–{formatNumber(max)}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 h-14 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Trend of ${points.length} readings, ${formatNumber(min)} to ${formatNumber(max)}`}
      >
        <path
          d={path}
          fill="none"
          stroke="var(--color-link)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={x(markIndex)}
          cy={y(points[markIndex].value)}
          r="3"
          fill="var(--color-link)"
        />
      </svg>
      <div className="flex justify-between font-mono text-xs text-ink-3">
        <span>{points[0].date.slice(0, 10)}</span>
        <span>{points[lastIndex].date.slice(0, 10)}</span>
      </div>
    </div>
  );
}

/** Convenience: only meaningful for value-bearing instruments. */
export function unitOf(instrument: Instrument | null): string | undefined {
  if (!instrument) return undefined;
  if (instrument.kind === 'gauge' || instrument.kind === 'readout') return instrument.unit;
  if (instrument.kind === 'multibar') return instrument.unit;
  return undefined;
}
