/**
 * Per-resource-type presentation helpers.
 *
 * `summarizeResource` picks a few meaningful fields for the results list, and
 * `describeResource` produces a longer set of label/value rows for the
 * human-readable detail panel. Both fall back to generic id/type handling for
 * resource types we don't special-case.
 */

import type {
  Address,
  AnyResource,
  CodeableConcept,
  Condition,
  Encounter,
  HumanName,
  MedicationRequest,
  Observation,
  Patient,
  Quantity,
} from './types';

export interface DisplayField {
  label: string;
  value: string;
}

export interface ResourceSummary {
  /** Primary line — usually a name or code. */
  title: string;
  /** Secondary label/value chips shown under the title. */
  fields: DisplayField[];
}

export function formatHumanName(name?: HumanName[]): string | undefined {
  if (!name?.length) return undefined;
  const n = name[0];
  if (n.text) return n.text;
  const given = n.given?.join(' ') ?? '';
  return [given, n.family].filter(Boolean).join(' ').trim() || undefined;
}

export function formatCodeableConcept(cc?: CodeableConcept): string | undefined {
  if (!cc) return undefined;
  return cc.text ?? cc.coding?.[0]?.display ?? cc.coding?.[0]?.code ?? undefined;
}

function formatQuantity(q?: Quantity): string | undefined {
  if (!q || q.value === undefined) return undefined;
  return `${q.value}${q.unit ? ` ${q.unit}` : ''}`;
}

function nonEmpty(fields: (DisplayField | undefined)[]): DisplayField[] {
  return fields.filter((f): f is DisplayField => !!f && !!f.value);
}

/** Compact summary for a results-list card. */
export function summarizeResource(resource: AnyResource): ResourceSummary {
  switch (resource.resourceType) {
    case 'Patient': {
      const p = resource as Patient;
      return {
        title: formatHumanName(p.name) ?? `Patient ${p.id ?? ''}`.trim(),
        fields: nonEmpty([
          p.gender ? { label: 'Gender', value: p.gender } : undefined,
          p.birthDate ? { label: 'Born', value: p.birthDate } : undefined,
          p.identifier?.[0]?.value
            ? { label: 'Identifier', value: p.identifier[0].value }
            : undefined,
        ]),
      };
    }
    case 'Observation': {
      const o = resource as Observation;
      const value =
        formatQuantity(o.valueQuantity) ??
        o.valueString ??
        formatCodeableConcept(o.valueCodeableConcept);
      return {
        title: formatCodeableConcept(o.code) ?? `Observation ${o.id ?? ''}`.trim(),
        fields: nonEmpty([
          value ? { label: 'Value', value } : undefined,
          o.status ? { label: 'Status', value: o.status } : undefined,
          o.effectiveDateTime
            ? { label: 'Effective', value: o.effectiveDateTime }
            : undefined,
        ]),
      };
    }
    case 'Condition': {
      const c = resource as Condition;
      return {
        title: formatCodeableConcept(c.code) ?? `Condition ${c.id ?? ''}`.trim(),
        fields: nonEmpty([
          formatCodeableConcept(c.clinicalStatus)
            ? { label: 'Clinical status', value: formatCodeableConcept(c.clinicalStatus)! }
            : undefined,
          c.recordedDate ? { label: 'Recorded', value: c.recordedDate } : undefined,
          c.onsetDateTime ? { label: 'Onset', value: c.onsetDateTime } : undefined,
        ]),
      };
    }
    case 'MedicationRequest': {
      const m = resource as MedicationRequest;
      const med =
        formatCodeableConcept(m.medicationCodeableConcept) ??
        m.medicationReference?.display;
      return {
        title: med ?? `MedicationRequest ${m.id ?? ''}`.trim(),
        fields: nonEmpty([
          m.status ? { label: 'Status', value: m.status } : undefined,
          m.intent ? { label: 'Intent', value: m.intent } : undefined,
          m.authoredOn ? { label: 'Authored', value: m.authoredOn } : undefined,
        ]),
      };
    }
    case 'Encounter': {
      const e = resource as Encounter;
      return {
        title:
          formatCodeableConcept(e.type?.[0]) ??
          e.class?.display ??
          `Encounter ${e.id ?? ''}`.trim(),
        fields: nonEmpty([
          e.status ? { label: 'Status', value: e.status } : undefined,
          e.period?.start ? { label: 'Start', value: e.period.start } : undefined,
          e.period?.end ? { label: 'End', value: e.period.end } : undefined,
        ]),
      };
    }
    default:
      return {
        title: `${resource.resourceType}${resource.id ? ` · ${resource.id}` : ''}`,
        fields: nonEmpty([
          resource.id ? { label: 'ID', value: resource.id } : undefined,
          resource.meta?.lastUpdated
            ? { label: 'Last updated', value: resource.meta.lastUpdated }
            : undefined,
        ]),
      };
  }
}

// --- Detail-view (human-readable) helpers ----------------------------------

/** Best display name for any resource that carries `name` (HumanName[]). */
export function primaryName(resource: AnyResource): string | undefined {
  const name = resource.name;
  if (Array.isArray(name)) return formatHumanName(name as HumanName[]);
  return undefined;
}

/** Title-case a contact system (`email` → `Email`, `phone` → `Phone`). */
export function formatContactSystem(system?: string): string {
  if (!system) return 'Contact';
  return system.charAt(0).toUpperCase() + system.slice(1);
}

/** A short, human label for an identifier system URI. */
export function labelForSystem(system?: string): string {
  if (!system) return 'Identifier';
  const known: Record<string, string> = {
    'http://hl7.org/fhir/sid/us-npi': 'NPI',
    'http://hl7.org/fhir/sid/us-ssn': 'SSN',
    'http://hl7.org/fhir/sid/us-medicare': 'Medicare',
  };
  if (known[system]) return known[system];
  try {
    const u = new URL(system);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    return seg ?? u.hostname;
  } catch {
    return system;
  }
}

/** Format a FHIR Address into display lines (street, locality, country). */
export function formatAddressLines(address: Address): string[] {
  const lines: string[] = [];
  if (address.line?.length) lines.push(...address.line.filter(Boolean));
  const locality = [address.city, [address.state, address.postalCode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  if (locality) lines.push(locality);
  if (address.country) lines.push(address.country);
  if (!lines.length && address.text) lines.push(address.text);
  return lines;
}

/**
 * Common search parameters we surface as first-class inputs per resource type.
 * `_id` and `_lastUpdated` are universal; the rest are type-specific hints.
 */
export function commonSearchParams(resourceType: string): string[] {
  const universal = ['_id', '_lastUpdated'];
  const byType: Record<string, string[]> = {
    Patient: ['name', 'identifier', 'birthdate', 'gender'],
    Observation: ['code', 'patient', 'category', 'date'],
    Condition: ['code', 'patient', 'clinical-status'],
    MedicationRequest: ['status', 'patient', 'intent'],
    Encounter: ['status', 'patient', 'class'],
  };
  return [...(byType[resourceType] ?? ['name', 'identifier']), ...universal];
}
