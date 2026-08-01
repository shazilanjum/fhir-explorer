/**
 * Type-aware "instruments".
 *
 * A generic explorer renders every resource the same way, which makes a body
 * temperature look exactly like an insurance claim. `deriveInstrument` reads a
 * resource and returns a small, typed description of the *right* visual for it —
 * a gauge for an in-range measurement, bars for a multi-component panel, a span
 * for something with a start and an end, and so on.
 *
 * Honesty rule: we only claim a value is low/normal/high when the **server**
 * supplied a `referenceRange`. We never invent clinical ranges — an unqualified
 * value falls back to a plain readout.
 */

import { formatCodeableConcept, formatHumanName } from './display';
import type {
  AnyResource,
  Condition,
  Encounter,
  MedicationRequest,
  Observation,
  Patient,
  Quantity,
} from './types';

export interface GaugeInstrument {
  kind: 'gauge';
  value: number;
  unit?: string;
  low?: number;
  high?: number;
  status: 'low' | 'normal' | 'high';
  rangeText?: string;
}

export interface MultiBarInstrument {
  kind: 'multibar';
  unit?: string;
  items: { label: string; value: number }[];
}

export interface ReadoutInstrument {
  kind: 'readout';
  value: string;
  unit?: string;
}

export interface SpanInstrument {
  kind: 'span';
  startLabel?: string;
  endLabel?: string;
  durationText?: string;
  statusLabel?: string;
  statusTone: 'accent' | 'neutral' | 'danger';
  ongoing: boolean;
}

export interface IdentityInstrument {
  kind: 'identity';
  initials: string;
  name: string;
  age?: number;
  chips: string[];
}

export interface DosageInstrument {
  kind: 'dosage';
  dose?: string;
  frequency?: number;
  periodLabel?: string;
  text?: string;
}

export type Instrument =
  | GaugeInstrument
  | MultiBarInstrument
  | ReadoutInstrument
  | SpanInstrument
  | IdentityInstrument
  | DosageInstrument;

// --- helpers ---------------------------------------------------------------

function num(q?: Quantity): number | undefined {
  return typeof q?.value === 'number' && Number.isFinite(q.value) ? q.value : undefined;
}

/** Trim float noise without pretending to more precision than we have. */
export function formatNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Whole years between a date and now, or undefined if unparseable/future. */
export function yearsSince(value?: string): number | undefined {
  const d = parseDate(value);
  if (!d) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDelta = now.getMonth() - d.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

/** Human duration between two instants (end defaults to now). */
function formatDuration(start?: string, end?: string): string | undefined {
  const s = parseDate(start);
  if (!s) return undefined;
  const e = parseDate(end) ?? new Date();
  const ms = e.getTime() - s.getTime();
  if (ms < 0) return undefined;
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hr`;
  const days = Math.round(hours / 24);
  if (days < 60) return `${days} d`;
  const months = Math.round(days / 30);
  if (months < 24) return `${months} mo`;
  return `${Math.round(months / 12)} yr`;
}

/** Show just the date part of a FHIR dateTime — times add noise here. */
function dateLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function initialsFrom(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Compact a component label so bars stay readable ("Systolic …" → "SYS"). */
function componentLabel(raw?: string): string {
  const label = (raw ?? '').toLowerCase();
  if (label.includes('systolic')) return 'SYS';
  if (label.includes('diastolic')) return 'DIA';
  if (label.includes('mean')) return 'MEAN';
  const first = (raw ?? '—').trim().split(/\s+/)[0];
  return first.length > 6 ? first.slice(0, 6) : first;
}

/** Map a Condition clinical status to a tone. */
function statusTone(status?: string): 'accent' | 'neutral' | 'danger' {
  const s = (status ?? '').toLowerCase();
  if (s === 'active' || s === 'recurrence' || s === 'relapse') return 'accent';
  if (s === 'resolved' || s === 'remission' || s === 'inactive') return 'neutral';
  return 'neutral';
}

// --- per-type derivations --------------------------------------------------

function observationInstrument(o: Observation): Instrument | null {
  // A panel (blood pressure, etc.) — one bar per measured component.
  const components = (o.component ?? []).filter((c) => num(c.valueQuantity) !== undefined);
  if (components.length >= 2) {
    return {
      kind: 'multibar',
      unit: components[0].valueQuantity?.unit,
      items: components.map((c) => ({
        label: componentLabel(formatCodeableConcept(c.code)),
        value: num(c.valueQuantity)!,
      })),
    };
  }

  const value = num(o.valueQuantity);
  if (value !== undefined) {
    const range = o.referenceRange?.find(
      (r) => num(r.low) !== undefined || num(r.high) !== undefined,
    );
    const low = num(range?.low);
    const high = num(range?.high);

    // Only grade the value when the server actually gave us a range.
    if (low !== undefined || high !== undefined) {
      const status =
        low !== undefined && value < low
          ? 'low'
          : high !== undefined && value > high
            ? 'high'
            : 'normal';
      return {
        kind: 'gauge',
        value,
        unit: o.valueQuantity?.unit,
        low,
        high,
        status,
        rangeText: range?.text,
      };
    }
    return { kind: 'readout', value: formatNumber(value), unit: o.valueQuantity?.unit };
  }

  const text = o.valueString ?? formatCodeableConcept(o.valueCodeableConcept);
  return text ? { kind: 'readout', value: text } : null;
}

function patientInstrument(p: Patient): IdentityInstrument | null {
  const name = formatHumanName(p.name);
  const age = yearsSince(p.birthDate);
  const chips = [p.gender, p.birthDate ? `born ${p.birthDate}` : undefined].filter(
    (v): v is string => !!v,
  );
  // Nothing worth drawing — don't invent a monogram out of the resource id.
  if (!name && !chips.length) return null;
  return {
    kind: 'identity',
    initials: name ? initialsFrom(name) : '—',
    name: name ?? '',
    age,
    chips,
  };
}

function encounterInstrument(e: Encounter): Instrument | null {
  const start = e.period?.start;
  if (!start) return null;
  return {
    kind: 'span',
    startLabel: dateLabel(start),
    endLabel: dateLabel(e.period?.end) ?? 'ongoing',
    durationText: formatDuration(start, e.period?.end),
    statusLabel: e.status,
    statusTone: e.status === 'in-progress' ? 'accent' : 'neutral',
    ongoing: !e.period?.end,
  };
}

function conditionInstrument(c: Condition): Instrument | null {
  const onset = c.onsetDateTime;
  const status = formatCodeableConcept(c.clinicalStatus);
  if (!onset && !status) return null;
  return {
    kind: 'span',
    startLabel: dateLabel(onset) ?? 'onset unknown',
    // `abatementDateTime` is the real end of a condition; recordedDate is not.
    endLabel: dateLabel(c.abatementDateTime) ?? 'ongoing',
    durationText: onset ? formatDuration(onset, c.abatementDateTime) : undefined,
    statusLabel: status,
    statusTone: statusTone(status),
    ongoing: !c.abatementDateTime,
  };
}

function medicationInstrument(m: MedicationRequest): Instrument | null {
  const dosage = m.dosageInstruction?.[0];
  if (!dosage) return null;
  const doseQuantity = dosage.doseAndRate?.find((d) => num(d.doseQuantity) !== undefined)
    ?.doseQuantity;
  const dose =
    doseQuantity && num(doseQuantity) !== undefined
      ? `${formatNumber(num(doseQuantity)!)}${doseQuantity.unit ? ` ${doseQuantity.unit}` : ''}`
      : undefined;
  const repeat = dosage.timing?.repeat;
  const frequency =
    typeof repeat?.frequency === 'number' && repeat.frequency > 0 && repeat.frequency <= 12
      ? repeat.frequency
      : undefined;
  const periodLabel = repeat?.periodUnit
    ? { s: 'second', min: 'minute', h: 'hour', d: 'day', wk: 'week', mo: 'month', a: 'year' }[
        repeat.periodUnit
      ]
    : undefined;

  if (!dose && !frequency && !dosage.text) return null;
  return { kind: 'dosage', dose, frequency, periodLabel, text: dosage.text };
}

/**
 * Pick the right instrument for a resource, or null when the resource has no
 * shape worth drawing (in which case the caller falls back to plain fields).
 */
export function deriveInstrument(resource: AnyResource): Instrument | null {
  switch (resource.resourceType) {
    case 'Observation':
      return observationInstrument(resource as Observation);
    case 'Patient':
      return patientInstrument(resource as Patient);
    case 'Encounter':
      return encounterInstrument(resource as Encounter);
    case 'Condition':
      return conditionInstrument(resource as Condition);
    case 'MedicationRequest':
      return medicationInstrument(resource as MedicationRequest);
    default:
      return null;
  }
}

/** Summary field labels an instrument already communicates (avoid duplicates). */
export function fieldsCoveredBy(instrument: Instrument | null): Set<string> {
  if (!instrument) return new Set();
  switch (instrument.kind) {
    case 'gauge':
    case 'multibar':
    case 'readout':
      return new Set(['Value']);
    case 'span':
      return new Set(['Status', 'Start', 'End', 'Onset', 'Clinical status']);
    case 'identity':
      return new Set(['Gender', 'Born']);
    case 'dosage':
      return new Set(['Status', 'Intent']);
    default:
      return new Set();
  }
}
