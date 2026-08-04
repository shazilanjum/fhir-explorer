/**
 * Structural diff between two versions of a resource, used by the version
 * scrubber to answer "what changed, and when?".
 *
 * We flatten each resource to a map of dot/bracket path → scalar leaf, then
 * compare the two maps. `meta.versionId` / `meta.lastUpdated` churn on every
 * version and would drown the signal, so they're excluded.
 */

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface FieldChange {
  path: string;
  kind: ChangeKind;
  before?: string;
  after?: string;
}

const IGNORED_PREFIXES = ['meta.versionId', 'meta.lastUpdated', 'meta.source', 'text.'];

function flatten(value: unknown, prefix: string, out: Map<string, string>): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out.set(prefix, String(value));
  }
}

function ignored(path: string): boolean {
  return IGNORED_PREFIXES.some((p) => path === p || path.startsWith(p));
}

/** Changes turning `before` into `after`, sorted by path. */
export function diffResources(before: unknown, after: unknown): FieldChange[] {
  const a = new Map<string, string>();
  const b = new Map<string, string>();
  flatten(before, '', a);
  flatten(after, '', b);

  const changes: FieldChange[] = [];
  const paths = new Set([...a.keys(), ...b.keys()]);

  for (const path of paths) {
    if (ignored(path)) continue;
    const hasA = a.has(path);
    const hasB = b.has(path);
    if (hasA && hasB) {
      if (a.get(path) !== b.get(path)) {
        changes.push({ path, kind: 'changed', before: a.get(path), after: b.get(path) });
      }
    } else if (hasB) {
      changes.push({ path, kind: 'added', after: b.get(path) });
    } else {
      changes.push({ path, kind: 'removed', before: a.get(path) });
    }
  }

  return changes.sort((x, y) => x.path.localeCompare(y.path));
}

/** The set of changed leaf paths (for highlighting), keyed for O(1) lookup. */
export function changedPathSet(changes: FieldChange[]): Set<string> {
  return new Set(changes.map((c) => c.path));
}
