/**
 * Search parameters read from the server, not guessed by us.
 *
 * A `CapabilityStatement` advertises exactly which parameters each resource
 * type supports, their FHIR search type, and often prose documentation. Using
 * that instead of a hardcoded list means the search form is correct on any
 * server — including ones with custom parameters we've never heard of — and it
 * lets us render a *type-appropriate* editor for each.
 *
 * See https://www.hl7.org/fhir/search.html for the encoding rules implemented
 * by `encodeParamValue`.
 */

import type { CapabilityStatement } from './types';

/**
 * Reduce a server's `searchParam.documentation` to one useful line.
 *
 * Params shared across resource types (`code`, `patient`, `date`…) are commonly
 * documented once, as a list covering every type that uses them:
 *
 *   "Multiple Resources: * [Condition](https://…): Code for the condition
 *    * [Observation](https://…): The code of the observation type * …"
 *
 * Rendered verbatim that's a paragraph of links about resources you aren't
 * looking at. We strip the markdown and keep only the entry for the type being
 * searched — and if there isn't one, we show nothing rather than noise.
 */
export function formatParamDocumentation(
  doc: string | undefined,
  resourceType: string,
): string | undefined {
  if (!doc) return undefined;

  // [Label](url) → Label, then collapse whitespace.
  const plain = doc
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!/^multiple resources\s*:/i.test(plain)) return plain || undefined;

  const body = plain.replace(/^multiple resources\s*:\s*/i, '');
  for (const entry of body.split(/\s\*\s/)) {
    const match = /^\*?\s*([A-Za-z]+)\s*:\s*(.+)$/.exec(entry.trim());
    if (match?.[1] === resourceType) return match[2].trim();
  }
  return undefined;
}

/** The FHIR search-parameter types we render editors for. */
export type SearchParamType =
  | 'number'
  | 'date'
  | 'string'
  | 'token'
  | 'reference'
  | 'composite'
  | 'quantity'
  | 'uri'
  | 'special';

export interface ServerSearchParam {
  name: string;
  type: SearchParamType;
  documentation?: string;
}

/** Prefixes valid on ordered types (number, date, quantity). */
export const COMPARISON_PREFIXES = [
  { value: '', label: '= (eq)' },
  { value: 'ne', label: '≠ (ne)' },
  { value: 'gt', label: '> (gt)' },
  { value: 'lt', label: '< (lt)' },
  { value: 'ge', label: '≥ (ge)' },
  { value: 'le', label: '≤ (le)' },
  { value: 'sa', label: 'starts after (sa)' },
  { value: 'eb', label: 'ends before (eb)' },
  { value: 'ap', label: '≈ (ap)' },
] as const;

/**
 * Target resource types for well-known reference parameters.
 *
 * `CapabilityStatement.rest.resource.searchParam` carries name/type/documentation
 * but *not* `SearchParameter.target`, so the server never tells us what a
 * reference is allowed to point at. For the parameters where FHIR fixes that
 * unambiguously we encode it here: offering a 146-item "any type" picker for
 * `patient` is worse than useless, since every choice but `Patient` builds an
 * invalid query.
 *
 * Only parameters whose targets are stable across resource types are listed.
 * Anything absent falls back to the server's full resource-type list.
 */
const REFERENCE_TARGETS: Record<string, string[]> = {
  // Single, unambiguous target — rendered as a fixed label, not a dropdown.
  patient: ['Patient'],
  encounter: ['Encounter'],
  specimen: ['Specimen'],
  location: ['Location'],
  organization: ['Organization'],

  // Genuinely several possibilities — rendered as a narrowed dropdown.
  subject: ['Patient', 'Group', 'Device', 'Location'],
  practitioner: ['Practitioner', 'PractitionerRole'],
  'general-practitioner': ['Practitioner', 'PractitionerRole', 'Organization'],
  performer: [
    'Practitioner',
    'PractitionerRole',
    'Organization',
    'CareTeam',
    'Patient',
    'RelatedPerson',
  ],
  requester: ['Practitioner', 'PractitionerRole', 'Organization', 'Patient', 'Device'],
  recorder: ['Practitioner', 'PractitionerRole', 'Patient', 'RelatedPerson'],
  asserter: ['Practitioner', 'PractitionerRole', 'Patient', 'RelatedPerson'],
};

/** Known targets for a reference parameter, or undefined to use the full list. */
export function referenceTargets(paramName: string): string[] | undefined {
  const targets = REFERENCE_TARGETS[paramName];
  return targets?.length ? targets : undefined;
}

/** The single target when a parameter has exactly one; otherwise undefined. */
export function soleReferenceTarget(paramName: string): string | undefined {
  const targets = referenceTargets(paramName);
  return targets?.length === 1 ? targets[0] : undefined;
}

/** Modifiers we surface for string parameters. */
export const STRING_MODIFIERS = [
  { value: '', label: 'starts with' },
  { value: 'contains', label: 'contains' },
  { value: 'exact', label: 'exact' },
] as const;

const KNOWN_TYPES = new Set<SearchParamType>([
  'number',
  'date',
  'string',
  'token',
  'reference',
  'composite',
  'quantity',
  'uri',
  'special',
]);

function coerceType(raw?: string): SearchParamType {
  return raw && KNOWN_TYPES.has(raw as SearchParamType) ? (raw as SearchParamType) : 'string';
}

/**
 * Pull the advertised search parameters for one resource type. Returns an empty
 * array when the server says nothing — callers then fall back to a static list.
 */
export function serverSearchParams(
  capability: CapabilityStatement | undefined,
  resourceType: string,
): ServerSearchParam[] {
  const rest = capability?.rest?.find((r) => r.mode === 'server') ?? capability?.rest?.[0];
  const entry = rest?.resource?.find((r) => r.type === resourceType);
  const params = entry?.searchParam ?? [];

  const byName = new Map<string, ServerSearchParam>();
  for (const p of params) {
    if (!p?.name || byName.has(p.name)) continue;
    byName.set(p.name, {
      name: p.name,
      type: coerceType(p.type),
      documentation: p.documentation,
    });
  }
  return [...byName.values()].sort((a, b) => {
    // Result-shaping params (_count, _sort…) sort last; they're not filters.
    const aMeta = a.name.startsWith('_');
    const bMeta = b.name.startsWith('_');
    if (aMeta !== bMeta) return aMeta ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

// --- Structured values -----------------------------------------------------

/**
 * A parameter's value, held in the shape its editor needs. Only the fields
 * relevant to the param's type are used.
 */
export interface ParamValue {
  /** number · date · quantity — comparison prefix (`ge`, `le`, …). */
  prefix?: string;
  /** string — `contains` / `exact`. */
  modifier?: string;
  /** The main scalar: the number, date, text, code, id, or URI. */
  value?: string;
  /** token — the code system URI; quantity — the unit system. */
  system?: string;
  /** quantity — the unit code (e.g. `mg`). */
  unit?: string;
  /** reference — the target resource type (e.g. `Patient`). */
  targetType?: string;
}

/** True when a value has enough content to be worth sending. */
export function hasValue(v: ParamValue | undefined): boolean {
  return !!(v && (v.value?.trim() || v.system?.trim()));
}

/**
 * Encode one structured value into a FHIR search value string.
 *
 * - token     → `system|code`, or `code`, or `system|`
 * - quantity  → `[prefix]value|system|unit`
 * - reference → `Type/id` (or the bare id if no type chosen)
 * - date/num  → `[prefix]value`
 */
export function encodeParamValue(
  type: SearchParamType,
  v: ParamValue,
  paramName?: string,
): string {
  const value = (v.value ?? '').trim();
  const system = (v.system ?? '').trim();

  switch (type) {
    case 'token': {
      if (system && value) return `${system}|${value}`;
      if (system) return `${system}|`;
      return value;
    }
    case 'quantity': {
      const unit = (v.unit ?? '').trim();
      if (!value) return '';
      // The middle segment is the unit *system*; omitted here for brevity, so
      // a bare unit code lands in the third position as FHIR expects.
      return unit ? `${v.prefix ?? ''}${value}|${system}|${unit}` : `${v.prefix ?? ''}${value}`;
    }
    case 'reference': {
      if (!value) return '';
      if (value.includes('/')) return value; // already qualified
      // A param with a single fixed target has no dropdown, so fall back to it.
      const target = v.targetType || (paramName ? soleReferenceTarget(paramName) : undefined);
      return target ? `${target}/${value}` : value;
    }
    case 'number':
    case 'date':
      return value ? `${v.prefix ?? ''}${value}` : '';
    default:
      return value;
  }
}

/** The query-string key, including any `:modifier` suffix. */
export function encodeParamKey(param: ServerSearchParam, v: ParamValue): string {
  if (param.type === 'string' && v.modifier) return `${param.name}:${v.modifier}`;
  return param.name;
}

/** Collapse structured values into the flat `Record<string,string>` we search with. */
export function buildQuery(
  params: ServerSearchParam[],
  values: Record<string, ParamValue>,
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const param of params) {
    const v = values[param.name];
    if (!hasValue(v)) continue;
    const encoded = encodeParamValue(param.type, v, param.name);
    if (encoded) query[encodeParamKey(param, v)] = encoded;
  }
  return query;
}

/**
 * Reverse of {@link buildQuery}: turn a committed query string back into
 * structured values so the editors reflect the active search after a reload or
 * a re-run from history.
 */
export function parseQuery(
  params: ServerSearchParam[],
  query: Record<string, string>,
): Record<string, ParamValue> {
  const byName = new Map(params.map((p) => [p.name, p]));
  const values: Record<string, ParamValue> = {};

  for (const [rawKey, raw] of Object.entries(query)) {
    const [name, modifier] = rawKey.split(':');
    const param = byName.get(name);
    if (!param) {
      // Unknown to this server — keep it as a plain string so it isn't lost.
      values[name] = { value: raw };
      continue;
    }

    switch (param.type) {
      case 'token': {
        const pipe = raw.indexOf('|');
        values[name] =
          pipe === -1
            ? { value: raw }
            : { system: raw.slice(0, pipe), value: raw.slice(pipe + 1) };
        break;
      }
      case 'quantity': {
        const [num, system = '', unit = ''] = raw.split('|');
        const m = /^(ne|gt|lt|ge|le|sa|eb|ap)?(.*)$/.exec(num) ?? [];
        values[name] = { prefix: m[1] ?? '', value: m[2] ?? '', system, unit };
        break;
      }
      case 'reference': {
        const slash = raw.indexOf('/');
        values[name] =
          slash === -1
            ? { value: raw }
            : { targetType: raw.slice(0, slash), value: raw.slice(slash + 1) };
        break;
      }
      case 'number':
      case 'date': {
        const m = /^(ne|gt|lt|ge|le|sa|eb|ap)?(.*)$/.exec(raw) ?? [];
        values[name] = { prefix: m[1] ?? '', value: m[2] ?? '' };
        break;
      }
      default:
        values[name] = { value: raw, modifier: modifier ?? '' };
    }
  }
  return values;
}
