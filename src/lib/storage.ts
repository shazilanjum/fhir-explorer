/**
 * Thin, safe wrappers over Web Storage. Reads/writes never throw — storage can
 * be unavailable (private browsing, sandboxed iframes, quota exceeded), and a
 * persistence nicety should never crash the app when that happens.
 */

const PREFIX = 'fhir-explorer:';

function keyFor(name: string): string {
  return `${PREFIX}${name}`;
}

export function readStorage(storage: Storage, name: string): string | null {
  try {
    return storage.getItem(keyFor(name));
  } catch {
    return null;
  }
}

export function writeStorage(storage: Storage, name: string, value: string): void {
  try {
    storage.setItem(keyFor(name), value);
  } catch {
    // Ignore — e.g. quota exceeded or storage disabled.
  }
}

export function removeStorage(storage: Storage, name: string): void {
  try {
    storage.removeItem(keyFor(name));
  } catch {
    // Ignore.
  }
}

/** Lazily read a persisted string, falling back when absent/unavailable. */
export function initialString(storage: Storage, name: string, fallback: string): string {
  return readStorage(storage, name) ?? fallback;
}
