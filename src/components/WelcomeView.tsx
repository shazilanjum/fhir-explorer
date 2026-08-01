/** Landing content shown before a resource type is selected. */

import NumberFlow from '@number-flow/react';
import { useServer } from '../context/ServerContext';
import { useCapabilityStatement } from '../hooks/useFhir';
import { getSmartOAuthUris } from '../fhir/client';
import { ErrorMessage, Skeleton } from './ui/primitives';

export function WelcomeView() {
  const { baseUrl, token } = useServer();
  const capability = useCapabilityStatement(baseUrl, token);

  const resourceCount = capability.data?.rest?.[0]?.resource?.length ?? undefined;
  const smart = getSmartOAuthUris(capability.data ?? undefined);

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        {/* The verb carries the emphasis — a pear band in Hum, an accent-coloured
            word with a drawn underline in Lumen. Never italic in either. */}
        {/* Markup stays sentence case for screen readers; Lumen lowercases it
            via CSS, Hum leaves it as written. */}
        <h1 className="ui-lower text-3xl text-ink">
          Built to <em className="verb">explore</em> FHIR.
        </h1>
        <p className="ui-lower mt-3 text-md leading-relaxed text-ink-2">
          Connect to any R4 server, browse the resource types it supports, run parameterized
          searches, and read results as a spec sheet or raw JSON.
        </p>
      </div>

      {capability.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {capability.isError && <ErrorMessage error={capability.error} />}

      {capability.isSuccess && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between bg-accent-weak px-5 py-3">
            <span className="label-mono">connected</span>
            <span
              className="h-2 w-2 rounded-full bg-accent-deep"
              aria-label="connected"
            />
          </div>
          <p className="border-b border-rule px-5 py-3 font-mono text-sm text-ink">{baseUrl}</p>
          <dl className="grid grid-cols-1 divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-5 py-4">
              <dt className="label-mono">software</dt>
              <dd className="mt-1 text-sm text-ink">
                {capability.data.software?.name ?? '—'}
                {capability.data.software?.version ? ` ${capability.data.software.version}` : ''}
              </dd>
            </div>
            <div className="px-5 py-4">
              <dt className="label-mono">fhir version</dt>
              <dd className="mt-1 font-mono text-sm text-ink">
                {capability.data.fhirVersion ?? '—'}
              </dd>
            </div>
            <div className="px-5 py-4">
              <dt className="label-mono">resource types</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
                {resourceCount === undefined ? '—' : <NumberFlow value={resourceCount} />}
              </dd>
            </div>
          </dl>
          {smart && (
            <div className="border-t border-rule px-5 py-3">
              <p className="label-mono">smart-on-fhir · this server supports oauth2</p>
              <p className="mt-1 text-xs text-ink-2">
                Protected reads need a bearer token — add one via the{' '}
                <span className="font-mono text-ink">token</span> button in the top bar. Endpoints:
              </p>
              <dl className="mt-1.5 space-y-1">
                {smart.authorize && (
                  <div className="flex gap-2 text-xs">
                    <dt className="w-16 shrink-0 font-mono text-ink-3">authorize</dt>
                    <dd className="min-w-0 flex-1 truncate font-mono text-ink" title={smart.authorize}>
                      {smart.authorize}
                    </dd>
                  </div>
                )}
                {smart.token && (
                  <div className="flex gap-2 text-xs">
                    <dt className="w-16 shrink-0 font-mono text-ink-3">token</dt>
                    <dd className="min-w-0 flex-1 truncate font-mono text-ink" title={smart.token}>
                      {smart.token}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      )}

      {capability.isSuccess && (
        <p className="text-sm text-ink-2">
          Pick a resource type from the rail, or press{' '}
          <kbd className="rounded-pill bg-paper-3 px-2 py-0.5 font-mono text-xs text-ink-2">⌘K</kbd>{' '}
          to jump.
        </p>
      )}
    </div>
  );
}
