/**
 * A tiny external store recording every FHIR HTTP call the app makes — the
 * "network tab" for the explorer.
 *
 * It lives outside React because `fhirClient` is a plain module: the client
 * pushes entries, and components subscribe via `useSyncExternalStore`.
 */

export interface RequestLogEntry {
  id: string;
  method: string;
  url: string;
  /** Undefined when the request never got a response (network / CORS). */
  status?: number;
  statusText?: string;
  ok: boolean;
  durationMs: number;
  /** Response body size in bytes (UTF-8), when we read one. */
  bytes?: number;
  /** ISO timestamp of when the request started. */
  at: string;
  /** True when an Authorization header was attached. */
  usedToken: boolean;
  /** Set when the call failed, mirroring FhirError.kind. */
  errorKind?: string;
}

const MAX_ENTRIES = 120;

let entries: RequestLogEntry[] = [];
let listeners: (() => void)[] = [];
let seq = 0;

function emit() {
  for (const l of listeners) l();
}

export const requestLog = {
  /** Newest first. Referentially stable until the next mutation. */
  getSnapshot(): RequestLogEntry[] {
    return entries;
  },

  subscribe(listener: () => void): () => void {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  add(entry: Omit<RequestLogEntry, 'id'>): void {
    const next: RequestLogEntry = { ...entry, id: `r${seq++}` };
    entries = [next, ...entries].slice(0, MAX_ENTRIES);
    emit();
  },

  clear(): void {
    entries = [];
    emit();
  },
};

/**
 * Build a runnable `curl` for an entry.
 *
 * The bearer token is deliberately emitted as `$FHIR_TOKEN` rather than the
 * literal value: copying a live credential to the clipboard without asking is
 * a footgun, and the placeholder is more useful anyway (export it once, reuse
 * across commands).
 */
export function toCurl(entry: RequestLogEntry): string {
  const parts = [`curl -sS`];
  if (entry.method !== 'GET') parts.push(`-X ${entry.method}`);
  parts.push(`-H 'Accept: application/fhir+json'`);
  if (entry.usedToken) parts.push(`-H "Authorization: Bearer $FHIR_TOKEN"`);
  parts.push(`'${entry.url}'`);
  return parts.join(' \\\n  ');
}

/** Human-readable byte size. */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
