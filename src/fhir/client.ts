/**
 * fhirClient — the single place every HTTP call to a FHIR server goes through.
 *
 * The browser talks to the FHIR server directly (no backend proxy), so this
 * module is responsible for building URLs, setting the right Accept header,
 * and normalizing the three failure modes we care about into a single
 * {@link FhirError}:
 *   1. Network / CORS failures (fetch rejects before we get a response).
 *   2. FHIR-level errors returned as an OperationOutcome (any status).
 *   3. Non-OK responses with no parseable OperationOutcome body.
 */

import { requestLog, type RequestLogEntry } from './requestLog';
import type {
  Bundle,
  CapabilityStatement,
  FhirResourceBase,
  OperationOutcome,
} from './types';

const FHIR_JSON = 'application/fhir+json';

export type FhirErrorKind = 'network' | 'operation-outcome' | 'http' | 'parse';

export class FhirError extends Error {
  readonly kind: FhirErrorKind;
  readonly status?: number;
  readonly operationOutcome?: OperationOutcome;

  constructor(
    kind: FhirErrorKind,
    message: string,
    opts?: { status?: number; operationOutcome?: OperationOutcome },
  ) {
    super(message);
    this.name = 'FhirError';
    this.kind = kind;
    this.status = opts?.status;
    this.operationOutcome = opts?.operationOutcome;
  }
}

/** Strip a trailing slash so we can safely template `${base}/${path}`. */
function normalizeBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function isOperationOutcome(value: unknown): value is OperationOutcome {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { resourceType?: string }).resourceType === 'OperationOutcome'
  );
}

/** Turn an OperationOutcome into a single readable sentence. */
export function summarizeOperationOutcome(outcome: OperationOutcome): string {
  if (!outcome.issue?.length) return 'The server returned an OperationOutcome with no issues.';
  return outcome.issue
    .map((issue) => {
      const detail =
        issue.diagnostics ??
        issue.details?.text ??
        issue.details?.coding?.[0]?.display ??
        issue.code;
      return `${issue.severity}: ${detail}`;
    })
    .join('\n');
}

/**
 * Core fetch wrapper. Accepts a fully-qualified URL (so it also serves Bundle
 * `next` links, which are absolute) and returns the parsed JSON body typed as T.
 *
 * `token`, when present, is sent as a `Authorization: Bearer` header — the
 * pragmatic path for SMART-on-FHIR / OAuth2-protected servers in a client-only
 * app. The token is never placed in the URL.
 */
async function request<T>(url: string, token?: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  const startedAt = new Date().toISOString();
  const t0 = performance.now();
  // Every exit path below records one log entry, so the inspector shows the
  // real traffic including failures.
  const record = (fields: Partial<Omit<RequestLogEntry, 'id'>>) => {
    requestLog.add({
      method,
      url,
      ok: false,
      durationMs: Math.round(performance.now() - t0),
      at: startedAt,
      usedToken: !!token,
      ...fields,
    });
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: FHIR_JSON,
        ...(init?.body ? { 'Content-Type': FHIR_JSON } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    // fetch only rejects for network-layer problems — DNS, offline, and the
    // opaque failure the browser reports when CORS preflight is blocked.
    record({ errorKind: 'network' });
    throw new FhirError(
      'network',
      `Could not reach the server. This is often a network outage or a CORS restriction on ${url}.`,
    );
  }

  const text = await response.text();
  const bytes = text ? new TextEncoder().encode(text).length : 0;
  const base = {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    bytes,
  };

  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (!response.ok) {
        record({ ...base, errorKind: 'http' });
        throw new FhirError('http', `Request failed (${response.status} ${response.statusText}).`, {
          status: response.status,
        });
      }
      record({ ...base, errorKind: 'parse' });
      throw new FhirError('parse', 'The server returned a response that was not valid JSON.');
    }
  }

  if (isOperationOutcome(body)) {
    // An OperationOutcome can come back on a 2xx (warnings) or an error status.
    // We only treat it as an error when the HTTP status is not OK.
    if (!response.ok) {
      record({ ...base, errorKind: 'operation-outcome' });
      throw new FhirError('operation-outcome', summarizeOperationOutcome(body), {
        status: response.status,
        operationOutcome: body,
      });
    }
  }

  if (!response.ok) {
    record({ ...base, errorKind: 'http' });
    throw new FhirError('http', `Request failed (${response.status} ${response.statusText}).`, {
      status: response.status,
    });
  }

  record(base);
  return body as T;
}

/** Build a search URL: `${base}/${ResourceType}?${params}`. */
export function buildSearchUrl(
  baseUrl: string,
  resourceType: string,
  params: Record<string, string> | URLSearchParams,
): string {
  const search = new URLSearchParams(params);
  const query = search.toString();
  return `${normalizeBase(baseUrl)}/${resourceType}${query ? `?${query}` : ''}`;
}

export const fhirClient = {
  /** Fetch the server's CapabilityStatement from `/metadata`. */
  async getCapabilityStatement(baseUrl: string, token?: string): Promise<CapabilityStatement> {
    return request<CapabilityStatement>(`${normalizeBase(baseUrl)}/metadata`, token);
  },

  /** Run a search and return the Bundle. */
  async search<T extends FhirResourceBase = FhirResourceBase>(
    baseUrl: string,
    resourceType: string,
    params: Record<string, string>,
    token?: string,
  ): Promise<Bundle<T>> {
    return request<Bundle<T>>(buildSearchUrl(baseUrl, resourceType, params), token);
  },

  /** Follow a Bundle `next` (or any relation) link — these are absolute URLs. */
  async fetchBundleLink<T extends FhirResourceBase = FhirResourceBase>(
    url: string,
    token?: string,
  ): Promise<Bundle<T>> {
    return request<Bundle<T>>(url, token);
  },

  /** Read a single resource by type + id. */
  async read<T extends FhirResourceBase = FhirResourceBase>(
    baseUrl: string,
    resourceType: string,
    id: string,
    token?: string,
  ): Promise<T> {
    return request<T>(`${normalizeBase(baseUrl)}/${resourceType}/${id}`, token);
  },

  /**
   * Resolve a single code via `CodeSystem/$lookup`. Returns the raw
   * `Parameters` resource — see `parseLookup` in `codings.ts`.
   *
   * Not universally available: a server may not implement the operation at all,
   * or may not have the requested code system loaded. Callers should surface
   * that distinction rather than implying the code is invalid.
   */
  async lookupCode(
    baseUrl: string,
    system: string | undefined,
    code: string,
    token?: string,
  ): Promise<unknown> {
    const params = new URLSearchParams({ code });
    if (system) params.set('system', system);
    return request<unknown>(
      `${normalizeBase(baseUrl)}/CodeSystem/$lookup?${params.toString()}`,
      token,
    );
  },
};

/**
 * Extract the SMART-on-FHIR OAuth endpoints a server advertises in its
 * CapabilityStatement (`rest.security.extension` → oauth-uris). Returns null
 * when the server doesn't declare them.
 */
export function getSmartOAuthUris(
  capability: CapabilityStatement | undefined,
): { authorize?: string; token?: string; register?: string; manage?: string } | null {
  const rest = capability?.rest?.find((r) => r.mode === 'server') ?? capability?.rest?.[0];
  const ext = rest?.security?.extension?.find(
    (e) => e.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
  );
  if (!ext?.extension?.length) return null;
  const out: Record<string, string> = {};
  for (const sub of ext.extension) {
    if (sub.url && sub.valueUri) out[sub.url] = sub.valueUri;
  }
  return Object.keys(out).length ? out : null;
}
