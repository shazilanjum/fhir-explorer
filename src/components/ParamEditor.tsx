/**
 * One editor per FHIR search-parameter type. The `type` the server advertises
 * decides the controls: a date gets a comparison prefix, a token gets a
 * system + code pair, a reference gets a resource-type + id pair, and so on.
 */

import {
  COMPARISON_PREFIXES,
  referenceTargets,
  soleReferenceTarget,
  STRING_MODIFIERS,
  type ParamValue,
  type ServerSearchParam,
} from '../fhir/searchParams';

const inputCls =
  'w-full rounded-input border-[1.5px] border-rule bg-paper px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent-deep focus:ring-2 focus:ring-focus/30';
const selectCls =
  'shrink-0 rounded-input border-[1.5px] border-rule bg-paper px-2 py-1.5 font-mono text-xs text-ink-2 outline-none focus:border-accent-deep focus:ring-2 focus:ring-focus/30';

export function ParamEditor({
  param,
  value,
  resourceTypes,
  onChange,
}: {
  param: ServerSearchParam;
  value: ParamValue;
  resourceTypes: string[];
  onChange: (next: ParamValue) => void;
}) {
  const patch = (fields: Partial<ParamValue>) => onChange({ ...value, ...fields });

  switch (param.type) {
    // Ordered types share the comparison-prefix control.
    case 'date':
      return (
        <div className="flex items-center gap-1.5">
          <select
            aria-label={`${param.name} comparison`}
            value={value.prefix ?? ''}
            onChange={(e) => patch({ prefix: e.target.value })}
            className={selectCls}
          >
            {COMPARISON_PREFIXES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {/* Text, not <input type="date"> — FHIR allows partial dates
              (`1974`, `1974-12`) that a native picker would reject. */}
          <input
            value={value.value ?? ''}
            onChange={(e) => patch({ value: e.target.value })}
            placeholder="YYYY-MM-DD"
            inputMode="numeric"
            className={`${inputCls} font-mono`}
          />
        </div>
      );

    case 'number':
      return (
        <div className="flex items-center gap-1.5">
          <select
            aria-label={`${param.name} comparison`}
            value={value.prefix ?? ''}
            onChange={(e) => patch({ prefix: e.target.value })}
            className={selectCls}
          >
            {COMPARISON_PREFIXES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            value={value.value ?? ''}
            onChange={(e) => patch({ value: e.target.value })}
            placeholder="0"
            inputMode="decimal"
            className={`${inputCls} font-mono`}
          />
        </div>
      );

    case 'quantity':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            aria-label={`${param.name} comparison`}
            value={value.prefix ?? ''}
            onChange={(e) => patch({ prefix: e.target.value })}
            className={selectCls}
          >
            {COMPARISON_PREFIXES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            value={value.value ?? ''}
            onChange={(e) => patch({ value: e.target.value })}
            placeholder="value"
            inputMode="decimal"
            className={`${inputCls} min-w-0 flex-1 font-mono`}
          />
          <input
            value={value.unit ?? ''}
            onChange={(e) => patch({ unit: e.target.value })}
            placeholder="unit (mg)"
            className={`${inputCls} min-w-0 basis-24 font-mono`}
          />
        </div>
      );

    // A token is `system|code`; either half may stand alone.
    case 'token':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={value.system ?? ''}
            onChange={(e) => patch({ system: e.target.value })}
            placeholder="system (optional)"
            className={`${inputCls} min-w-0 flex-1 font-mono`}
          />
          <span className="font-mono text-ink-3">|</span>
          <input
            value={value.value ?? ''}
            onChange={(e) => patch({ value: e.target.value })}
            placeholder="code"
            className={`${inputCls} min-w-0 flex-1 font-mono`}
          />
        </div>
      );

    case 'reference': {
      // FHIR fixes the target for many reference params (`patient` is always a
      // Patient). Where it does, show that as a label — a picker would only
      // offer ways to build an invalid query.
      const sole = soleReferenceTarget(param.name);
      const known = referenceTargets(param.name);
      const options = known ?? resourceTypes;

      return (
        <div className="flex items-center gap-1.5">
          {sole ? (
            <span className="shrink-0 rounded-input bg-paper-3 px-2.5 py-1.5 font-mono text-sm text-ink-2">
              {sole}
            </span>
          ) : (
            <select
              aria-label={`${param.name} target type`}
              value={value.targetType ?? ''}
              onChange={(e) => patch({ targetType: e.target.value })}
              className={`${selectCls} max-w-[9rem]`}
            >
              <option value="">any type</option>
              {options.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <span className="font-mono text-ink-3">/</span>
          <input
            value={value.value ?? ''}
            onChange={(e) => patch({ value: e.target.value })}
            placeholder="id"
            className={`${inputCls} font-mono`}
          />
        </div>
      );
    }

    case 'string':
      return (
        <div className="flex items-center gap-1.5">
          <select
            aria-label={`${param.name} match`}
            value={value.modifier ?? ''}
            onChange={(e) => patch({ modifier: e.target.value })}
            className={selectCls}
          >
            {STRING_MODIFIERS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            value={value.value ?? ''}
            onChange={(e) => patch({ value: e.target.value })}
            placeholder="text"
            className={inputCls}
          />
        </div>
      );

    default:
      // uri · composite · special — a plain field is the honest editor; we
      // don't pretend to understand composite grammar.
      return (
        <input
          value={value.value ?? ''}
          onChange={(e) => patch({ value: e.target.value })}
          placeholder={param.type === 'uri' ? 'http://…' : 'value'}
          className={`${inputCls} font-mono`}
        />
      );
  }
}
