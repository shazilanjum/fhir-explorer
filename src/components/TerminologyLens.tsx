/**
 * The terminology lens. Lists every `Coding` in a resource and resolves any of
 * them on demand via `CodeSystem/$lookup`, turning `8867-4` into "Heart rate"
 * with its definition and properties.
 *
 * Resolution is per-code and lazy — one click, one request, cached by
 * system|code for the session. Servers vary wildly in what terminology they
 * host, so an unresolved code is reported as a *server capability* limit, never
 * as "this code is wrong".
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fhirClient, FhirError } from '../fhir/client';
import { codeSystemLabel, parseLookup, type FoundCoding } from '../fhir/codings';
import { useServer } from '../context/ServerContext';
import { DelayedSpinner } from './ui/primitives';

function useCodeLookup(system: string | undefined, code: string, enabled: boolean) {
  const { baseUrl, token } = useServer();
  return useQuery({
    queryKey: ['code-lookup', baseUrl, system ?? '', code, token],
    queryFn: async () => parseLookup(await fhirClient.lookupCode(baseUrl, system, code, token)),
    enabled: enabled && !!baseUrl && !!code,
    retry: false,
    staleTime: 30 * 60 * 1000, // terminology is effectively immutable
  });
}

/** Explain a failed lookup in terms of the server, not the code. */
function lookupFailureMessage(error: unknown, system?: string): string {
  const label = codeSystemLabel(system);
  if (error instanceof FhirError) {
    if (error.status === 404 || error.status === 400) {
      return `This server doesn't have ${label} loaded, so it can't expand this code. The code itself may still be valid.`;
    }
    if (error.status === 501) {
      return `This server doesn't implement CodeSystem/$lookup.`;
    }
    if (error.kind === 'network') {
      return 'Could not reach the terminology endpoint (network or CORS).';
    }
    return error.message;
  }
  return 'Lookup failed.';
}

function CodingRow({ coding }: { coding: FoundCoding }) {
  const [open, setOpen] = useState(false);
  const lookup = useCodeLookup(coding.system, coding.code ?? '', open);
  const data = lookup.data;

  return (
    <li className="border-t border-rule first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-1 py-2 text-left transition-colors hover:bg-paper-3"
        aria-expanded={open}
      >
        <span className="mt-0.5 shrink-0 rounded-pill bg-accent-weak px-2 py-0.5 font-mono text-xs text-accent-text">
          {codeSystemLabel(coding.system)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-all font-mono text-sm text-ink">{coding.code}</span>
          {coding.display && (
            <span className="mt-0.5 block text-xs text-ink-2">{coding.display}</span>
          )}
        </span>
        <span className="mt-1 shrink-0 font-mono text-xs text-ink-3">
          {open ? '−' : 'resolve'}
        </span>
      </button>

      {open && (
        <div className="px-1 pb-3 pl-3">
          {lookup.isLoading && (
            <p className="inline-flex items-center gap-2 font-mono text-xs text-ink-2">
              <DelayedSpinner className="h-3 w-3" /> looking up…
            </p>
          )}

          {lookup.isError && (
            <p className="border-l-2 border-danger bg-danger-weak px-3 py-2 text-xs text-ink-2">
              {lookupFailureMessage(lookup.error, coding.system)}
            </p>
          )}

          {data && (
            <div className="space-y-2 border-l-2 border-accent pl-3">
              {data.display && (
                <p className="font-display text-md font-medium text-ink">{data.display}</p>
              )}
              {(data.name || data.version) && (
                <p className="font-mono text-xs text-ink-3">
                  {data.name}
                  {data.version ? ` · v${data.version}` : ''}
                </p>
              )}
              {data.definition && (
                <p className="text-xs leading-relaxed text-ink-2">{data.definition}</p>
              )}
              {data.properties.length > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  {data.properties.slice(0, 8).map((p, i) => (
                    <div key={`${p.code}-${i}`} className="col-span-2 grid grid-cols-subgrid">
                      <dt className="font-mono text-xs uppercase text-ink-3">{p.code}</dt>
                      <dd className="break-words font-mono text-xs text-ink-2">{p.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {data.designations.length > 0 && (
                <p className="text-xs text-ink-3">
                  <span className="font-mono uppercase">also</span>{' '}
                  {data.designations.slice(0, 4).join(' · ')}
                </p>
              )}
              {!data.display && !data.definition && data.properties.length === 0 && (
                <p className="text-xs text-ink-2">
                  The server resolved this code but returned no display or definition.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function TerminologyLens({ codings }: { codings: FoundCoding[] }) {
  if (codings.length === 0) return null;
  return (
    <div className="border-t border-rule px-5 py-4">
      <p className="label-mono mb-1">codes · {codings.length}</p>
      <p className="mb-2 text-xs text-ink-3">
        Resolve a code against this server's terminology.
      </p>
      <ul>
        {codings.map((coding) => (
          <CodingRow key={`${coding.system ?? ''}|${coding.code}`} coding={coding} />
        ))}
      </ul>
    </div>
  );
}
