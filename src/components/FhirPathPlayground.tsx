/**
 * A live FHIRPath scratchpad, evaluated against the resource currently open.
 *
 * FHIRPath is the language FHIR itself uses for validation invariants, search
 * definitions, and mapping — but there's rarely a place to just *try* an
 * expression against a real resource. This evaluates as you type (debounced),
 * against the actual resource in view, and renders whatever comes back.
 *
 * Evaluation is pure and local (the `fhirpath` library, no network), so there's
 * nothing to log or fail on the wire — only the expression itself can error,
 * which we surface inline.
 */

import { useMemo, useState } from 'react';
import fhirpath from 'fhirpath';
import type { AnyResource } from '../fhir/types';

const EXAMPLES = [
  'Observation.value.ofType(Quantity).value',
  "code.coding.where(system='http://loinc.org').code",
  'name.given.first()',
  'telecom.where(system=\'phone\').value',
  'component.code.text',
  'identifier.value',
];

interface EvalResult {
  ok: boolean;
  values?: unknown[];
  error?: string;
}

function evaluate(resource: AnyResource, expr: string): EvalResult {
  const trimmed = expr.trim();
  if (!trimmed) return { ok: true, values: [] };
  try {
    // fhirpath.evaluate always returns an array of matches.
    const values = fhirpath.evaluate(resource, trimmed) as unknown[];
    return { ok: true, values };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid expression' };
  }
}

function renderValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function FhirPathPlayground({ resource }: { resource: AnyResource }) {
  const [expr, setExpr] = useState('');

  // Cheap enough to run on every keystroke — no debounce needed for one resource.
  const result = useMemo(() => evaluate(resource, expr), [resource, expr]);
  const hasExpr = expr.trim().length > 0;

  return (
    <div className="border-t border-rule px-5 py-4">
      <p className="label-mono mb-1">fhirpath</p>
      <p className="mb-2 text-xs text-ink-3">
        Evaluate an expression against this {resource.resourceType}, live.
      </p>

      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-accent-text">›</span>
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder={`${resource.resourceType}.…`}
          spellCheck={false}
          autoComplete="off"
          className={`w-full rounded-input border-[1.5px] bg-paper px-2.5 py-1.5 font-mono text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-focus/30 ${
            hasExpr && !result.ok ? 'border-danger' : 'border-rule focus:border-accent-deep'
          }`}
        />
      </div>

      {/* Result */}
      {hasExpr && (
        <div className="mt-2">
          {!result.ok ? (
            <p className="border-l-2 border-danger bg-danger-weak px-3 py-2 font-mono text-xs text-ink-2">
              {result.error}
            </p>
          ) : result.values && result.values.length > 0 ? (
            <div>
              <p className="mb-1 font-mono text-xs text-ink-3">
                {result.values.length} {result.values.length === 1 ? 'match' : 'matches'}
              </p>
              <pre
                className="scrollbar-thin max-h-56 overflow-auto rounded-card bg-code p-3 font-mono text-xs leading-relaxed text-code-ink"
              >
                <code>{result.values.map(renderValue).join('\n')}</code>
              </pre>
            </div>
          ) : (
            <p className="font-mono text-xs text-ink-3">no matches</p>
          )}
        </div>
      )}

      {/* Example expressions */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setExpr(ex)}
            className="rounded-pill bg-paper-3 px-2 py-0.5 font-mono text-xs text-ink-3 transition-colors hover:text-ink"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
