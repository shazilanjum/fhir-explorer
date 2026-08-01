/** Small presentational primitives shared across the app. */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { FhirError } from '../../fhir/client';
import type { OperationOutcome } from '../../fhir/types';

/** Shimmering placeholder block used while requests are in flight. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-card bg-paper-3 ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-paper/70 to-transparent" />
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

/**
 * Spinner that only appears after `delay` ms, so fast requests don't flash it.
 * (Audit fix: spinners-that-flash.)
 */
export function DelayedSpinner({
  className = '',
  delay = 150,
}: {
  className?: string;
  delay?: number;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return show ? <Spinner className={className} /> : null;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'cyan' | 'danger';
}) {
  // Each accent owns its own kind of surface — they never blend.
  const tones: Record<string, string> = {
    neutral: 'bg-paper-3 text-ink-2',
    accent: 'bg-accent-weak text-accent-text',
    cyan: 'bg-cyan-weak text-link',
    danger: 'bg-danger-weak text-danger',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 font-mono text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Generic empty state. */
export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border-[1.5px] border-dashed border-rule bg-paper px-6 py-12 text-center">
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <p className="font-display font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-2">{description}</p>}
    </div>
  );
}

/**
 * Renders any thrown error into a friendly message. FhirError carries a `kind`
 * so we can tailor the copy; OperationOutcome issues are listed out.
 */
export function ErrorMessage({ error }: { error: unknown }) {
  let heading = 'Something went wrong';
  let body: ReactNode = 'An unexpected error occurred.';
  let outcome: OperationOutcome | undefined;
  // A 401/403 almost always means the server wants a bearer token.
  const needsAuth =
    error instanceof FhirError && (error.status === 401 || error.status === 403);

  if (error instanceof FhirError) {
    outcome = error.operationOutcome;
    switch (error.kind) {
      case 'network':
        heading = 'Could not reach the server';
        body =
          'This is usually a network problem or a CORS restriction. Check the base URL and that the server allows browser requests.';
        break;
      case 'operation-outcome':
        heading = `Server returned an error${error.status ? ` (${error.status})` : ''}`;
        body = error.message;
        break;
      case 'http':
        heading = 'Request failed';
        body = error.message;
        break;
      case 'parse':
        heading = 'Unexpected response';
        body = error.message;
        break;
    }
  } else if (error instanceof Error) {
    body = error.message;
  }

  return (
    <div
      role="alert"
      className="rounded-card bg-danger-weak px-4 py-3 text-sm text-ink ring-[1.5px] ring-danger/25"
    >
      <p className="font-display font-semibold text-danger">{heading}</p>
      <p className="mt-1 whitespace-pre-wrap text-ink-2">{body}</p>
      {needsAuth && (
        <p className="mt-2 border-t border-danger/15 pt-2 text-ink-2">
          This server appears to require authentication. Add a bearer token via the{' '}
          <span className="font-mono text-ink">token</span> button in the top bar (SMART-on-FHIR /
          OAuth2).
        </p>
      )}
      {outcome?.issue?.length ? (
        <ul className="mt-2 space-y-1 border-t border-danger/15 pt-2 font-mono text-xs text-ink-2">
          {outcome.issue.map((issue, i) => (
            <li key={i}>
              <span className="uppercase text-danger">{issue.severity}</span> · {issue.code}
              {issue.diagnostics ? ` — ${issue.diagnostics}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Copy-to-clipboard button with transient inline "Copied" feedback (silent
 * success — no toast). Toasts fire only on failure.
 */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not access the clipboard');
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className="btn btn--soft !px-3 !py-1 !font-mono !text-xs"
    >
      {copied ? <span className="text-accent-text">Copied</span> : <span>{label}</span>}
    </button>
  );
}
