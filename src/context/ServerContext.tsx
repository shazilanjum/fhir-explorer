/**
 * ServerContext tracks the active FHIR base URL, an optional bearer token, and
 * a session-scoped history of searches that can be re-run.
 *
 * `baseUrl` and `token` persist to `sessionStorage` — they survive a reload but
 * clear when the tab closes, which is the right lifetime for a bearer token
 * (never written to `localStorage`, never sent anywhere but the Authorization
 * header). Search history stays in memory only.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { initialString, removeStorage, writeStorage } from '../lib/storage';

/** A few well-known CORS-friendly R4 servers, offered in the connect bar. */
export const PRESET_SERVERS: { label: string; url: string }[] = [
  { label: 'HAPI R4 (public test)', url: 'https://hapi.fhir.org/baseR4' },
  { label: 'SMART Health IT', url: 'https://r4.smarthealthit.org' },
];

export const DEFAULT_BASE_URL = PRESET_SERVERS[0].url;

const BASE_URL_KEY = 'baseUrl';
const TOKEN_KEY = 'token';

export interface SearchHistoryEntry {
  id: string;
  baseUrl: string;
  resourceType: string;
  params: Record<string, string>;
  /** ISO timestamp captured when the search was run. */
  ranAt: string;
}

interface ServerContextValue {
  /** The base URL the user has committed to (via Connect). */
  baseUrl: string;
  connect: (url: string) => void;
  /**
   * Optional bearer token for SMART-on-FHIR / OAuth2-protected servers.
   * Persisted to sessionStorage — sent as `Authorization: Bearer`.
   */
  token: string;
  setToken: (token: string) => void;
  history: SearchHistoryEntry[];
  addHistory: (entry: Omit<SearchHistoryEntry, 'id' | 'ranAt'>) => void;
  clearHistory: () => void;
}

const ServerContext = createContext<ServerContextValue | null>(null);

const MAX_HISTORY = 25;

export function ServerProvider({ children }: { children: ReactNode }) {
  const [baseUrl, setBaseUrl] = useState<string>(() =>
    initialString(sessionStorage, BASE_URL_KEY, DEFAULT_BASE_URL),
  );
  const [token, setTokenState] = useState<string>(() =>
    initialString(sessionStorage, TOKEN_KEY, ''),
  );
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  // Monotonic counter for stable history keys without Date.now/Math.random.
  const seqRef = useRef(0);

  const connect = useCallback((url: string) => {
    const normalized = url.trim().replace(/\/+$/, '');
    setBaseUrl(normalized);
    writeStorage(sessionStorage, BASE_URL_KEY, normalized);
  }, []);

  const setToken = useCallback((next: string) => {
    setTokenState(next);
    if (next) {
      writeStorage(sessionStorage, TOKEN_KEY, next);
    } else {
      removeStorage(sessionStorage, TOKEN_KEY);
    }
  }, []);

  const addHistory = useCallback(
    (entry: Omit<SearchHistoryEntry, 'id' | 'ranAt'>) => {
      setHistory((prev) => {
        // Collapse consecutive duplicate searches.
        const isDup =
          prev[0] &&
          prev[0].baseUrl === entry.baseUrl &&
          prev[0].resourceType === entry.resourceType &&
          JSON.stringify(prev[0].params) === JSON.stringify(entry.params);
        if (isDup) return prev;
        const next: SearchHistoryEntry = {
          ...entry,
          id: `h${seqRef.current++}`,
          ranAt: new Date().toISOString(),
        };
        return [next, ...prev].slice(0, MAX_HISTORY);
      });
    },
    [],
  );

  const clearHistory = useCallback(() => setHistory([]), []);

  const value = useMemo(
    () => ({ baseUrl, connect, token, setToken, history, addHistory, clearHistory }),
    [baseUrl, connect, token, setToken, history, addHistory, clearHistory],
  );

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer(): ServerContextValue {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error('useServer must be used within a ServerProvider');
  return ctx;
}
