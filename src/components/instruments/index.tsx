/**
 * The instrument visuals. Each takes a typed descriptor from
 * `fhir/instruments.ts` and draws it with design-system tokens only.
 *
 * All of these are deliberately small and static — this is data the user is
 * reading, so nothing animates.
 */

import { formatNumber, type Instrument } from '../../fhir/instruments';

/** Clamp to 0..1 for positioning markers. */
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * A value against its reference range. The normal band is drawn from the
 * server-supplied low/high; the marker sits where the value falls.
 */
function Gauge({ data }: { data: Extract<Instrument, { kind: 'gauge' }> }) {
  const { value, unit, low, high, status, rangeText } = data;

  // Build a domain that shows the range plus headroom, and always includes the
  // value itself (so an extreme reading is still visible on the track).
  const lo = low ?? high! * 0.5;
  const hi = high ?? low! * 1.5;
  const span = Math.max(hi - lo, Math.abs(hi) * 0.1 || 1);
  let min = lo - span * 0.6;
  let max = hi + span * 0.6;
  if (value < min) min = value - span * 0.2;
  if (value > max) max = value + span * 0.2;
  const scale = (n: number) => clamp01((n - min) / (max - min));

  const bandStart = scale(lo);
  const bandEnd = scale(hi);
  const marker = scale(value);
  const outOfRange = status !== 'normal';

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold tabular-nums text-ink">
          {formatNumber(value)}
        </span>
        {unit && <span className="font-mono text-xs text-ink-2">{unit}</span>}
        {/* Coral is the one high-energy moment; pear carries "all good". */}
        <span
          className={`ml-auto rounded-pill px-2 py-0.5 font-mono text-xs font-medium uppercase ${
            outOfRange ? 'bg-danger-weak text-danger' : 'bg-accent-weak text-accent-text'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Track: full domain, normal band highlighted, marker on top. */}
      <div className="relative mt-2.5 h-2.5 w-full rounded-pill bg-paper-3">
        <div
          className={`absolute inset-y-0 rounded-pill ${outOfRange ? 'bg-rule' : 'bg-accent'}`}
          style={{ left: `${bandStart * 100}%`, right: `${(1 - bandEnd) * 100}%` }}
        />
        <div
          className={`absolute -top-1 h-4.5 w-1 rounded-pill ring-2 ring-paper ${
            outOfRange ? 'bg-pop' : 'bg-ink'
          }`}
          style={{ left: `calc(${marker * 100}% - 2px)`, height: '1.125rem' }}
        />
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-xs text-ink-3">
        <span>{low !== undefined ? formatNumber(low) : '—'}</span>
        <span className="text-ink-2">{rangeText ?? 'reference range'}</span>
        <span>{high !== undefined ? formatNumber(high) : '—'}</span>
      </div>
    </div>
  );
}

/** One bar per component — blood-pressure panels and similar. */
function MultiBar({ data }: { data: Extract<Instrument, { kind: 'multibar' }> }) {
  const max = Math.max(...data.items.map((i) => i.value)) * 1.15 || 1;
  return (
    <div className="space-y-1.5">
      {data.items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-10 shrink-0 font-mono text-xs uppercase text-ink-2">{item.label}</span>
          <div className="h-2.5 min-w-0 flex-1 rounded-pill bg-paper-3">
            <div
              className="h-full rounded-pill bg-accent"
              style={{ width: `${clamp01(item.value / max) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-display text-sm font-bold tabular-nums text-ink">
            {formatNumber(item.value)}
          </span>
        </div>
      ))}
      {data.unit && (
        <p className="pl-12 font-mono text-xs text-ink-3">{data.unit}</p>
      )}
    </div>
  );
}

/** A value with no server-supplied range — shown large, ungraded. */
function Readout({ data }: { data: Extract<Instrument, { kind: 'readout' }> }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-2xl font-bold tabular-nums text-ink">{data.value}</span>
      {data.unit && <span className="font-mono text-xs text-ink-2">{data.unit}</span>}
    </div>
  );
}

/** start ——— end, with a duration and a status pip. */
function Span({ data }: { data: Extract<Instrument, { kind: 'span' }> }) {
  const chip =
    data.statusTone === 'accent'
      ? 'bg-accent-weak text-accent-text'
      : data.statusTone === 'danger'
        ? 'bg-danger-weak text-danger'
        : 'bg-paper-3 text-ink-2';
  return (
    <div>
      {data.statusLabel && (
        <div className="mb-2">
          <span
            className={`inline-flex items-center rounded-pill px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wide ${chip}`}
          >
            {data.statusLabel}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-ink">{data.startLabel}</span>
        <span className="relative h-px min-w-0 flex-1 bg-rule">
          {data.durationText && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-paper px-1.5 text-ink-2">
              {data.durationText}
            </span>
          )}
        </span>
        <span className={data.ongoing ? 'text-ink-3' : 'text-ink'}>{data.endLabel}</span>
      </div>
    </div>
  );
}

/** Monogram + computed age for a person. */
function Identity({ data }: { data: Extract<Instrument, { kind: 'identity' }> }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent font-display text-sm font-bold text-accent-ink shadow-[0_3px_0_0_var(--color-accent-deep)]"
        aria-hidden="true"
        title={data.name || undefined}
      >
        {data.initials}
      </span>
      <div className="min-w-0">
        {data.age !== undefined && (
          <p className="font-display text-lg font-bold text-ink">
            <span className="tabular-nums">{data.age}</span>{' '}
            <span className="text-sm font-medium text-ink-2">yrs</span>
          </p>
        )}
        {data.chips.length > 0 && (
          <p className="truncate font-mono text-xs text-ink-2">{data.chips.join(' · ')}</p>
        )}
      </div>
    </div>
  );
}

/** Dose + a dot per administration in the period. */
function DosageStrip({ data }: { data: Extract<Instrument, { kind: 'dosage' }> }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {data.dose && (
          <span className="rounded-pill bg-accent-weak px-2.5 py-0.5 font-mono text-sm font-medium text-ink">
            {data.dose}
          </span>
        )}
        {data.frequency !== undefined && (
          <span className="flex items-center gap-1.5">
            <span className="flex gap-1" aria-hidden="true">
              {Array.from({ length: data.frequency }).map((_, i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-accent ring-1 ring-accent-deep/50"
                />
              ))}
            </span>
            <span className="font-mono text-xs text-ink-2">
              {data.frequency}× {data.periodLabel ? `/ ${data.periodLabel}` : ''}
            </span>
          </span>
        )}
      </div>
      {data.text && <p className="mt-1.5 text-sm text-ink-2">{data.text}</p>}
    </div>
  );
}

/** Dispatch a descriptor to its visual. */
export function InstrumentView({ instrument }: { instrument: Instrument }) {
  switch (instrument.kind) {
    case 'gauge':
      return <Gauge data={instrument} />;
    case 'multibar':
      return <MultiBar data={instrument} />;
    case 'readout':
      return <Readout data={instrument} />;
    case 'span':
      return <Span data={instrument} />;
    case 'identity':
      return <Identity data={instrument} />;
    case 'dosage':
      return <DosageStrip data={instrument} />;
    default:
      return null;
  }
}
