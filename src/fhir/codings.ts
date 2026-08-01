/**
 * Coding extraction + `$lookup` result parsing for the terminology lens.
 *
 * A resource is full of `Coding` objects that render as dead text — a bare
 * `8867-4` tells you nothing. This module finds every coding, and parses the
 * `Parameters` resource that `CodeSystem/$lookup` returns into something
 * displayable.
 */

import type { Coding } from './types';

export interface FoundCoding extends Coding {
  /** Dot/bracket path where the coding was found, e.g. `code.coding[0]`. */
  path: string;
}

const MAX_CODINGS = 60;

/** Keys whose contents are metadata rather than clinical content. */
const SKIP_KEYS = new Set(['meta', 'text']);

/**
 * Recursively collect every `Coding` — an object carrying a `code`, usually
 * alongside a `system`. Deduplicated by system|code so a code repeated across
 * a resource is only resolved once.
 */
export function extractCodings(resource: unknown): FoundCoding[] {
  const found: FoundCoding[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown, path: string) => {
    if (found.length >= MAX_CODINGS || node === null || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }

    const obj = node as Record<string, unknown>;

    // A Coding has a `code`; `system` and `display` are optional but typical.
    // Guard against Identifier (has `value`) and Quantity (has `value`).
    const isCoding =
      typeof obj.code === 'string' && obj.value === undefined && obj.reference === undefined;
    if (isCoding) {
      const system = typeof obj.system === 'string' ? obj.system : undefined;
      const key = `${system ?? ''}|${obj.code}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push({
          path: path || 'coding',
          code: obj.code as string,
          system,
          display: typeof obj.display === 'string' ? obj.display : undefined,
        });
      }
    }

    for (const [key, value] of Object.entries(obj)) {
      if (SKIP_KEYS.has(key)) continue;
      walk(value, path ? `${path}.${key}` : key);
    }
  };

  walk(resource, '');
  return found;
}

/** A friendly short name for a well-known code system URI. */
export function codeSystemLabel(system?: string): string {
  if (!system) return 'no system';
  const known: Record<string, string> = {
    'http://loinc.org': 'LOINC',
    'http://snomed.info/sct': 'SNOMED CT',
    'http://www.nlm.nih.gov/research/umls/rxnorm': 'RxNorm',
    'http://unitsofmeasure.org': 'UCUM',
    'http://hl7.org/fhir/sid/icd-10': 'ICD-10',
    'http://hl7.org/fhir/sid/icd-10-cm': 'ICD-10-CM',
    'http://hl7.org/fhir/sid/cvx': 'CVX',
    'http://terminology.hl7.org/CodeSystem/observation-category': 'Observation category',
    'http://terminology.hl7.org/CodeSystem/condition-clinical': 'Condition clinical status',
    'http://terminology.hl7.org/CodeSystem/v3-ActCode': 'v3 ActCode',
  };
  if (known[system]) return known[system];
  // Fall back to the last meaningful URI segment.
  try {
    const u = new URL(system);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    return seg ?? u.hostname;
  } catch {
    return system;
  }
}

// --- $lookup response parsing ----------------------------------------------

/** One part of a `Parameters.parameter` entry. */
interface ParametersPart {
  name?: string;
  valueString?: string;
  valueCode?: string;
  valueBoolean?: boolean;
  valueCoding?: Coding;
  part?: ParametersPart[];
}

interface ParametersResource {
  resourceType?: string;
  parameter?: ParametersPart[];
}

export interface LookupResult {
  /** The concept's preferred display name. */
  display?: string;
  /** The code system's own name, as the server reports it. */
  name?: string;
  version?: string;
  definition?: string;
  /** Extra `property` rows the server returned (code → value). */
  properties: { code: string; value: string }[];
  /** `designation` alternatives (synonyms, other languages). */
  designations: string[];
}

function partValue(part: ParametersPart): string | undefined {
  if (part.valueString !== undefined) return part.valueString;
  if (part.valueCode !== undefined) return part.valueCode;
  if (part.valueBoolean !== undefined) return String(part.valueBoolean);
  if (part.valueCoding) return part.valueCoding.display ?? part.valueCoding.code;
  return undefined;
}

/**
 * Flatten a `$lookup` Parameters response. The shape is deliberately loose
 * across servers, so every field is optional and we never throw on a surprise.
 */
export function parseLookup(resource: unknown): LookupResult {
  const result: LookupResult = { properties: [], designations: [] };
  const params = (resource as ParametersResource)?.parameter;
  if (!Array.isArray(params)) return result;

  for (const p of params) {
    switch (p.name) {
      case 'display':
        result.display = p.valueString ?? result.display;
        break;
      case 'name':
        result.name = p.valueString ?? result.name;
        break;
      case 'version':
        result.version = p.valueString ?? result.version;
        break;
      case 'definition':
        result.definition = p.valueString ?? result.definition;
        break;
      case 'property': {
        // property is a group: { part: [{name:'code',...},{name:'value',...}] }
        const code = p.part?.find((x) => x.name === 'code');
        const value = p.part?.find((x) => x.name === 'value' || x.name === 'valueString');
        const codeText = code ? partValue(code) : undefined;
        const valueText = value ? partValue(value) : undefined;
        if (codeText && valueText) {
          // `definition` sometimes arrives as a property rather than top-level.
          if (codeText === 'definition' && !result.definition) result.definition = valueText;
          else result.properties.push({ code: codeText, value: valueText });
        }
        break;
      }
      case 'designation': {
        const value = p.part?.find((x) => x.name === 'value');
        const text = value ? partValue(value) : undefined;
        if (text) result.designations.push(text);
        break;
      }
    }
  }
  return result;
}
