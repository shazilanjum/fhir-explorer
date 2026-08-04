/**
 * A patient's whole record on one page — the clinical story, not a raw dump.
 *
 * Assembled from `$everything` (or a per-type fallback, see
 * usePatientEverything): an identity header, vitals charted over time, a
 * chronological timeline of every dated resource, and the active problem +
 * medication lists. Reuses the same instruments the rest of the app draws with.
 */

import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useServer } from '../context/ServerContext';
import { usePatientEverything } from '../hooks/usePatientEverything';
import { deriveInstrument } from '../fhir/instruments';
import { formatCodeableConcept, summarizeResource } from '../fhir/display';
import type { AnyResource, Observation } from '../fhir/types';
import { InstrumentView } from './instruments';
import { Sparkline } from './instruments/Sparkline';
import type { SeriesPoint } from '../hooks/useObservationSeries';
import { ErrorMessage, Skeleton } from './ui/primitives';

/** The most meaningful timestamp on a resource, across the usual date fields. */
function resourceDate(r: AnyResource): string | undefined {
  const rec = r as Record<string, unknown>;
  const candidates = [
    rec.effectiveDateTime,
    (rec.effectivePeriod as { start?: string } | undefined)?.start,
    (rec.period as { start?: string } | undefined)?.start,
    rec.authoredOn,
    rec.recordedDate,
    rec.onsetDateTime,
    rec.occurrenceDateTime,
    rec.issued,
    rec.date,
    r.meta?.lastUpdated,
  ];
  return candidates.find((c): c is string => typeof c === 'string');
}

const TYPE_COLOR: Record<string, string> = {
  Encounter: 'var(--color-link)',
  Observation: 'var(--color-accent)',
  Condition: 'var(--color-accent-3)',
  Procedure: 'var(--color-lavender)',
  MedicationRequest: 'var(--color-mint)',
  MedicationStatement: 'var(--color-mint)',
  Immunization: 'var(--color-accent-2)',
};

function typeColor(t: string): string {
  return TYPE_COLOR[t] ?? 'var(--color-ink-3)';
}

/** Group value-bearing Observations into per-code numeric series. */
function vitalSeries(observations: AnyResource[]): { label: string; unit?: string; points: SeriesPoint[] }[] {
  const groups = new Map<string, { label: string; unit?: string; points: SeriesPoint[] }>();
  for (const o of observations as Observation[]) {
    const value = o.valueQuantity?.value;
    const date = resourceDate(o);
    if (typeof value !== 'number' || !Number.isFinite(value) || !date) continue;
    const label = formatCodeableConcept(o.code) ?? 'value';
    const g = groups.get(label) ?? { label, unit: o.valueQuantity?.unit, points: [] };
    g.points.push({ date, value });
    groups.set(label, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, points: g.points.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, 6);
}

function Timeline({ events }: { events: { date: string; type: string; label: string }[] }) {
  if (events.length < 2) return null;
  const times = events.map((e) => new Date(e.date).getTime()).filter((t) => !Number.isNaN(t));
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = max - min || 1;
  const at = (d: string) => ((new Date(d).getTime() - min) / span) * 100;

  return (
    <div>
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-8 h-px bg-rule" />
        {events.map((e, i) => {
          const t = new Date(e.date).getTime();
          if (Number.isNaN(t)) return null;
          return (
            <div
              key={i}
              className="absolute top-8 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${at(e.date)}%` }}
              title={`${e.type} · ${e.label} · ${e.date.slice(0, 10)}`}
            >
              <span
                className="block h-2.5 w-2.5 rounded-full ring-2 ring-paper"
                style={{ backgroundColor: typeColor(e.type) }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-xs text-ink-3">
        <span>{new Date(min).toISOString().slice(0, 10)}</span>
        <span>{events.length} events</span>
        <span>{new Date(max).toISOString().slice(0, 10)}</span>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card px-5 py-4">
      <p className="label-mono mb-3">{title}</p>
      {children}
    </section>
  );
}

export function PatientDossier() {
  const { id = '' } = useParams();
  const { baseUrl, token } = useServer();
  const query = usePatientEverything(baseUrl, id, token);

  const back = `/explore/Patient/${id}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to={back} className="font-mono text-ink-2 transition-colors hover:text-accent">
          ← Patient
        </Link>
        <span className="text-ink-3">/</span>
        <span className="label-mono">dossier</span>
      </div>

      {query.isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {query.isError && <ErrorMessage error={query.error} />}

      {query.isSuccess &&
        (() => {
          const record = query.data;
          const observations = record.byType.Observation ?? [];
          const conditions = record.byType.Condition ?? [];
          const meds = [
            ...(record.byType.MedicationRequest ?? []),
            ...(record.byType.MedicationStatement ?? []),
          ];
          const series = vitalSeries(observations);

          const events = Object.entries(record.byType)
            .flatMap(([type, list]) =>
              list.map((r) => {
                const date = resourceDate(r);
                return date ? { date, type, label: summarizeResource(r).title } : null;
              }),
            )
            .filter((e): e is { date: string; type: string; label: string } => !!e)
            .sort((a, b) => a.date.localeCompare(b.date));

          const identity = record.patient ? deriveInstrument(record.patient) : null;
          const patientTitle = record.patient
            ? summarizeResource(record.patient).title
            : `Patient ${id}`;

          const otherCounts = Object.entries(record.byType)
            .filter(([t]) => !['Observation', 'Condition', 'MedicationRequest', 'MedicationStatement'].includes(t))
            .sort((a, b) => b[1].length - a[1].length);

          return (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Identity + provenance */}
              <section className="card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <h1 className="font-display text-xl font-medium text-ink">{patientTitle}</h1>
                  {identity && (
                    <div className="mt-2">
                      <InstrumentView instrument={identity} />
                    </div>
                  )}
                </div>
                <div className="text-right font-mono text-xs text-ink-3">
                  <p>
                    {record.total} linked {record.total === 1 ? 'resource' : 'resources'}
                  </p>
                  <p className="mt-0.5">
                    via {record.method === 'everything' ? '$everything' : 'patient search'}
                  </p>
                </div>
              </section>

              {events.length >= 2 && (
                <Panel title={`timeline · ${events.length}`}>
                  <Timeline events={events} />
                </Panel>
              )}

              {series.length > 0 && (
                <Panel title="vitals over time">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                    {series.map((s) => (
                      <div key={s.label}>
                        <p className="mb-1 text-sm text-ink">{s.label}</p>
                        {s.points.length >= 2 ? (
                          <Sparkline points={s.points} unit={s.unit} />
                        ) : (
                          <p className="font-display text-lg tabular-nums text-ink">
                            {s.points[0].value}
                            {s.unit ? <span className="ml-1 font-mono text-xs text-ink-2">{s.unit}</span> : null}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {conditions.length > 0 && (
                  <Panel title={`conditions · ${conditions.length}`}>
                    <ul className="space-y-2">
                      {conditions.slice(0, 12).map((c, i) => {
                        const status = formatCodeableConcept(
                          (c as Record<string, unknown>).clinicalStatus as never,
                        );
                        return (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: typeColor('Condition') }}
                            />
                            <span className="min-w-0 flex-1 text-ink">
                              {summarizeResource(c).title}
                              {status && <span className="ml-2 font-mono text-xs text-ink-3">{status}</span>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </Panel>
                )}

                {meds.length > 0 && (
                  <Panel title={`medications · ${meds.length}`}>
                    <ul className="space-y-2">
                      {meds.slice(0, 12).map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: typeColor('MedicationRequest') }}
                          />
                          <span className="min-w-0 flex-1 text-ink">{summarizeResource(m).title}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </div>

              {otherCounts.length > 0 && (
                <Panel title="also in this record">
                  <div className="flex flex-wrap gap-2">
                    {otherCounts.map(([type, list]) => (
                      <Link
                        key={type}
                        to={`/explore/${type}?patient=Patient/${id}`}
                        className="inline-flex items-center gap-2 rounded-pill bg-paper-3 px-3 py-1 font-mono text-xs text-ink-2 transition-colors hover:text-ink"
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: typeColor(type) }} />
                        {type}
                        <span className="tabular-nums text-ink-3">{list.length}</span>
                      </Link>
                    ))}
                  </div>
                </Panel>
              )}

              {record.total === 0 && (
                <Panel title="empty">
                  <p className="text-sm text-ink-2">
                    No linked resources came back for this patient — the server may not support{' '}
                    <code className="font-mono text-ink">$everything</code>, or this patient has no
                    associated data.
                  </p>
                </Panel>
              )}
            </motion.div>
          );
        })()}
    </div>
  );
}
