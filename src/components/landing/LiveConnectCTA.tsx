/**
 * The hero's call to action doubles as a live demo: paste a base URL and it
 * really connects — fetching that server's own CapabilityStatement and
 * showing its real identity — before you ever land inside the app. There is
 * no separate "Get started" button; this input *is* the product.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fhirClient, FhirError } from '../../fhir/client';
import { useServer, DEFAULT_BASE_URL } from '../../context/ServerContext';
import { DelayedSpinner } from '../ui/primitives';

export function LiveConnectCTA() {
  const { connect } = useServer();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(DEFAULT_BASE_URL);
  const [committed, setCommitted] = useState(DEFAULT_BASE_URL);

  const probe = useQuery({
    queryKey: ['landing-probe', committed],
    queryFn: () => fhirClient.getCapabilityStatement(committed),
    enabled: !!committed,
    retry: false,
    staleTime: 60 * 1000,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = draft.trim().replace(/\/+$/, '');
    if (normalized) setCommitted(normalized);
  };

  const open = () => {
    connect(committed);
    navigate('/explore');
  };

  const resourceCount = (() => {
    const rest = probe.data?.rest?.find((r) => r.mode === 'server') ?? probe.data?.rest?.[0];
    return new Set(rest?.resource?.map((r) => r.type) ?? []).size;
  })();

  return (
    <div className="card p-4">
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <label htmlFor="landing-base-url" className="sr-only">
          FHIR base URL
        </label>
        <input
          id="landing-base-url"
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={DEFAULT_BASE_URL}
          className="min-w-0 flex-1 rounded-input border-[1.5px] border-rule bg-paper px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent-deep focus:ring-2 focus:ring-focus/30"
        />
        <button type="submit" className="btn">
          Connect
        </button>
      </form>

      <div className="mt-3 min-h-[3.25rem] font-mono text-sm">
        {probe.isLoading && (
          <p className="inline-flex items-center gap-2 text-ink-2">
            <DelayedSpinner className="h-3.5 w-3.5" /> connecting to {new URL(committed).host}…
          </p>
        )}

        {probe.isError && (
          <p className="text-danger">
            {probe.error instanceof FhirError && probe.error.kind === 'network'
              ? `Couldn't reach that server — check the URL, or that it allows browser requests (CORS).`
              : 'That connection failed.'}
          </p>
        )}

        {probe.isSuccess && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-weak px-2 py-0.5 text-ink-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-deep" />
              {probe.data.software?.name ?? 'FHIR server'}
              {probe.data.software?.version ? ` ${probe.data.software.version}` : ''}
            </span>
            <span className="text-ink-3">
              FHIR {probe.data.fhirVersion ?? '—'} · {resourceCount} resource types
            </span>
            <button type="button" onClick={open} className="btn btn--soft ml-auto">
              Open in explorer →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
