/**
 * FHIR is a graph, but a JSON viewer renders it as dead strings. This module
 * walks a resource, finds every `Reference`, and parses it into something
 * navigable so `"subject": { "reference": "Patient/123" }` becomes a link.
 *
 * Reference forms we handle:
 *   Patient/123                      → relative, navigable
 *   http://host/fhir/Patient/123     → absolute; navigable only when the base
 *                                      matches the server we're connected to
 *   Patient/123/_history/2           → versioned, navigable (version dropped)
 *   #contained-id                    → internal to this resource, not navigable
 *   urn:uuid:… / urn:oid:…           → bundle-local or identifier, not navigable
 */

export type ReferenceKind = 'relative' | 'absolute' | 'contained' | 'urn' | 'unknown';

export interface ParsedReference {
  /** Dot/bracket path where the reference was found, e.g. `performer[0]`. */
  path: string;
  /** The original reference string, unmodified. */
  raw: string;
  resourceType?: string;
  id?: string;
  /** `Reference.display`, when the server provided one. */
  display?: string;
  kind: ReferenceKind;
  /** True when we can build a route to it on the current server. */
  navigable: boolean;
}

const MAX_REFERENCES = 80;

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** A FHIR resource type is UpperCamelCase. */
function looksLikeResourceType(segment: string): boolean {
  return /^[A-Z][A-Za-z]+$/.test(segment);
}

export function parseReference(raw: string, baseUrl: string): ParsedReference {
  const base: Omit<ParsedReference, 'path'> = {
    raw,
    kind: 'unknown',
    navigable: false,
  };

  if (raw.startsWith('#')) return { ...base, path: '', kind: 'contained' };
  if (raw.toLowerCase().startsWith('urn:')) return { ...base, path: '', kind: 'urn' };

  // Drop any `/_history/{version}` suffix before locating type/id.
  const withoutVersion = raw.replace(/\/_history\/[^/]+$/, '');
  const segments = withoutVersion.split('/').filter(Boolean);
  if (segments.length < 2) return { ...base, path: '' };

  const id = segments[segments.length - 1];
  const resourceType = segments[segments.length - 2];
  if (!looksLikeResourceType(resourceType)) return { ...base, path: '' };

  const isAbsolute = /^https?:\/\//i.test(raw);
  if (!isAbsolute) {
    return { ...base, path: '', resourceType, id, kind: 'relative', navigable: true };
  }

  // Absolute: only navigable if it points at the server we're talking to,
  // otherwise the id would be resolved against the wrong server.
  const refBase = normalizeBase(withoutVersion.slice(0, withoutVersion.lastIndexOf(`/${resourceType}/`)));
  const sameServer = !!baseUrl && refBase === normalizeBase(baseUrl);
  return {
    ...base,
    path: '',
    resourceType,
    id,
    kind: 'absolute',
    navigable: sameServer,
  };
}

/** Keys that never contain useful references for navigation. */
const SKIP_KEYS = new Set(['meta', 'text', 'contained']);

/**
 * Recursively collect every `Reference` in a resource, in document order.
 * Deduplicated by path so repeated structures don't spam the list.
 */
export function extractReferences(resource: unknown, baseUrl: string): ParsedReference[] {
  const found: ParsedReference[] = [];

  const walk = (node: unknown, path: string) => {
    if (found.length >= MAX_REFERENCES || node === null || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }

    const obj = node as Record<string, unknown>;

    // A Reference is any object carrying a `reference` string.
    if (typeof obj.reference === 'string' && obj.reference) {
      const parsed = parseReference(obj.reference, baseUrl);
      found.push({
        ...parsed,
        path: path || 'reference',
        display: typeof obj.display === 'string' ? obj.display : undefined,
      });
      // Keep walking — a Reference can nest an `identifier`, but not more refs.
    }

    for (const [key, value] of Object.entries(obj)) {
      if (SKIP_KEYS.has(key) || key === 'reference' || key === 'display') continue;
      walk(value, path ? `${path}.${key}` : key);
    }
  };

  walk(resource, '');
  return found;
}

/** Unique (type, id) pairs we can actually navigate to — the graph's nodes. */
export function navigableTargets(
  references: ParsedReference[],
): { resourceType: string; id: string; label: string; paths: string[] }[] {
  const byKey = new Map<string, { resourceType: string; id: string; label: string; paths: string[] }>();
  for (const ref of references) {
    if (!ref.navigable || !ref.resourceType || !ref.id) continue;
    const key = `${ref.resourceType}/${ref.id}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.paths.push(ref.path);
      if (!existing.label && ref.display) existing.label = ref.display;
    } else {
      byKey.set(key, {
        resourceType: ref.resourceType,
        id: ref.id,
        label: ref.display ?? '',
        paths: [ref.path],
      });
    }
  }
  return [...byKey.values()];
}
