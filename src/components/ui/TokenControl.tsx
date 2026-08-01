/**
 * Bearer-token control for SMART-on-FHIR / OAuth2-protected servers. The token
 * is sent as `Authorization: Bearer` and persisted to `sessionStorage` (see
 * ServerContext) — it survives a reload but clears when the tab closes; it is
 * never written to `localStorage` and never placed in the URL. If the server
 * advertises SMART OAuth endpoints in its CapabilityStatement, we surface them
 * here so the user knows where to obtain a token.
 */

import { useState } from 'react';
import { Popover } from '@base-ui-components/react/popover';
import { useServer } from '../../context/ServerContext';
import { useCapabilityStatement } from '../../hooks/useFhir';
import { getSmartOAuthUris } from '../../fhir/client';

export function TokenControl() {
  const { baseUrl, token, setToken } = useServer();
  const capability = useCapabilityStatement(baseUrl, token);
  const smart = getSmartOAuthUris(capability.data ?? undefined);

  const [draft, setDraft] = useState(token);
  const [reveal, setReveal] = useState(false);
  const active = token.length > 0;

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) setDraft(token);
      }}
    >
      <Popover.Trigger
        className={`inline-flex items-center gap-1.5 rounded-pill border-[1.5px] px-3 py-1.5 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          active
            ? 'border-accent-deep bg-accent-weak font-medium text-accent-text'
            : 'border-rule bg-paper text-ink-2 hover:bg-paper-3 hover:text-ink'
        }`}
        aria-label={active ? 'Bearer token set' : 'Add bearer token'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {active ? (
            <>
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 018 0v4" />
            </>
          ) : (
            <>
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 017.9-1" />
            </>
          )}
        </svg>
        <span>{active ? 'auth' : 'token'}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end" className="z-50">
          <Popover.Popup className="w-[min(92vw,26rem)] rounded-card bg-paper p-4 shadow-pop ring-[1.5px] ring-rule outline-none">
            <p className="label-mono">bearer token</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">
              For SMART-on-FHIR / OAuth2 servers. Sent as{' '}
              <code className="font-mono text-ink">Authorization: Bearer …</code>. Kept in this
              tab's session storage — survives a reload, clears when the tab closes. Never placed
              in the URL.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <input
                type={reveal ? 'text' : 'password'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="paste access token"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-input border-[1.5px] border-rule bg-paper px-2.5 py-1.5 font-mono text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent-deep focus:ring-2 focus:ring-focus/30"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="btn btn--soft shrink-0 !px-3 !py-1 !font-mono !text-xs"
              >
                {reveal ? 'hide' : 'show'}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Popover.Close onClick={() => setToken(draft.trim())} className="btn">
                Apply
              </Popover.Close>
              <button
                type="button"
                onClick={() => {
                  setDraft('');
                  setToken('');
                }}
                disabled={!draft && !active}
                className="btn btn--soft"
              >
                Clear
              </button>
            </div>

            {smart && (
              <div className="mt-4 border-t border-rule pt-3">
                <p className="label-mono">smart endpoints (from /metadata)</p>
                <dl className="mt-1.5 space-y-1">
                  {smart.authorize && (
                    <SmartRow label="authorize" value={smart.authorize} />
                  )}
                  {smart.token && <SmartRow label="token" value={smart.token} />}
                  {smart.register && <SmartRow label="register" value={smart.register} />}
                </dl>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SmartRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <dt className="w-16 shrink-0 font-mono text-ink-3">{label}</dt>
      <dd className="min-w-0 flex-1 truncate font-mono text-ink" title={value}>
        {value}
      </dd>
    </div>
  );
}
