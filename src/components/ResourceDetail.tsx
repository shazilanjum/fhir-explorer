/**
 * Two-pane detail view (Spec-sheet split): a structured, human-readable panel
 * on the left and the syntax-highlighted raw JSON (with copy) on the right.
 *
 * The left panel is a *curated* view — name, core attributes, contact points,
 * identifiers, and addresses rendered as readable blocks with full (wrapping)
 * values. The right pane is the source of truth for everything else, so the
 * left never needs to dump every leaf.
 */

import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { fhirClient } from '../fhir/client';
import {
  formatAddressLines,
  formatContactSystem,
  labelForSystem,
  primaryName,
  summarizeResource,
} from '../fhir/display';
import { deriveInstrument } from '../fhir/instruments';
import { extractReferences } from '../fhir/references';
import { extractCodings } from '../fhir/codings';
import { useObservationSeries } from '../hooks/useObservationSeries';
import type {
  Address,
  AnyResource,
  ContactPoint,
  Identifier,
  Observation,
} from '../fhir/types';
import { useServer } from '../context/ServerContext';
import { InstrumentView } from './instruments';
import { Sparkline, unitOf } from './instruments/Sparkline';
import { ReferenceGraph } from './ReferenceGraph';
import { TerminologyLens } from './TerminologyLens';
import { FhirPathPlayground } from './FhirPathPlayground';
import { VersionScrubber } from './VersionScrubber';
import { JsonView } from './ui/JsonView';
import { Badge, CopyButton, ErrorMessage, Skeleton } from './ui/primitives';

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Scalar top-level fields worth showing; complex/technical keys live in JSON. */
const SKIP_DETAIL_KEYS = new Set([
  'resourceType',
  'id',
  'meta',
  'text',
  'name',
  'telecom',
  'identifier',
  'address',
  'photo',
  'extension',
  'modifierExtension',
  'contained',
  'implicitRules',
  'language',
]);

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 font-mono text-xs uppercase tracking-wide text-ink-2 sm:w-32">
        {label}
      </dt>
      <dd className={`min-w-0 flex-1 break-words text-ink ${mono ? 'font-mono text-sm' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-rule px-5 py-4">
      <p className="label-mono mb-2.5">{title}</p>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

/** A `Reference` rendered as a link when it resolves on this server. */
function ReferenceRow({
  path,
  target,
}: {
  path: string;
  target: ReturnType<typeof extractReferences>[number];
}) {
  const label = target.display ?? `${target.resourceType ?? '?'}/${target.id ?? ''}`;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 break-all font-mono text-xs text-ink-2 sm:w-32">{path}</dt>
      <dd className="min-w-0 flex-1">
        {target.navigable && target.resourceType && target.id ? (
          <Link
            to={`/explore/${target.resourceType}/${target.id}`}
            className="break-all font-mono text-sm font-medium text-link underline decoration-cyan/40 underline-offset-2 transition-colors hover:text-link-hover hover:decoration-link"
            title={target.raw}
          >
            {label}
          </Link>
        ) : (
          <span className="break-all font-mono text-sm text-ink-2" title={target.raw}>
            {label}
            <span className="ml-1.5 text-ink-3">({target.kind})</span>
          </span>
        )}
      </dd>
    </div>
  );
}

function HumanReadable({ resource }: { resource: AnyResource }) {
  const { baseUrl } = useServer();
  const summary = summarizeResource(resource);
  const title = primaryName(resource) ?? summary.title;
  const instrument = deriveInstrument(resource);

  const telecom = asArray<ContactPoint>(resource.telecom);
  const identifiers = asArray<Identifier>(resource.identifier);
  const addresses = asArray<Address>(resource.address);
  const references = extractReferences(resource, baseUrl);
  const codings = extractCodings(resource);

  // Observations get their own trend, fetched lazily (detail view only).
  const observation = resource.resourceType === 'Observation' ? (resource as Observation) : undefined;
  const series = useObservationSeries(baseUrl, observation);

  const details = Object.entries(resource)
    .filter(
      ([k, v]) =>
        !SKIP_DETAIL_KEYS.has(k) &&
        (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'),
    )
    .map(([k, v]) => ({ label: k, value: String(v) }));

  return (
    <div className="flex flex-col">
      <div className="bg-accent-weak px-5 py-4">
        <h2 className="break-words font-display text-lg font-bold text-ink">{title}</h2>
        <p className="mt-1 font-mono text-xs text-ink-2">
          {resource.resourceType}
          {resource.id ? ` · ${resource.id}` : ''}
        </p>
      </div>

      {instrument && (
        <div className="border-t border-rule px-5 py-4">
          <InstrumentView instrument={instrument} />
        </div>
      )}

      {series.data && series.data.length > 1 && (
        <div className="border-t border-rule px-5 py-4">
          <p className="label-mono mb-2">trend</p>
          <Sparkline
            points={series.data}
            unit={unitOf(instrument)}
            currentDate={observation?.effectiveDateTime}
          />
        </div>
      )}

      {details.length > 0 && (
        <Section title="attributes">
          {details.map((d) => (
            <Row key={d.label} label={d.label} value={d.value} />
          ))}
        </Section>
      )}

      <TerminologyLens codings={codings} />

      {references.length > 0 && (
        <Section title={`references · ${references.length}`}>
          {references.map((ref, i) => (
            <ReferenceRow key={`${ref.path}-${i}`} path={ref.path} target={ref} />
          ))}
        </Section>
      )}

      {telecom.length > 0 && (
        <Section title="contact">
          {telecom.map((t, i) => (
            <Row
              key={i}
              label={formatContactSystem(t.system)}
              value={`${t.value ?? ''}${t.use ? `  (${t.use})` : ''}`}
              mono
            />
          ))}
        </Section>
      )}

      {identifiers.length > 0 && (
        <Section title="identifiers">
          {identifiers.map((id, i) => (
            <div key={i} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
              <dt
                className="shrink-0 font-mono text-xs uppercase tracking-wide text-ink-2 sm:w-32"
                title={id.system}
              >
                {labelForSystem(id.system)}
              </dt>
              <dd className="min-w-0 flex-1 break-all font-mono text-sm text-ink">{id.value}</dd>
            </div>
          ))}
        </Section>
      )}

      {addresses.length > 0 && (
        <Section title="address">
          {addresses.map((a, i) => (
            <div key={i} className="text-ink">
              {formatAddressLines(a).map((line, j) => (
                <p key={j} className="break-words">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </Section>
      )}

      <FhirPathPlayground resource={resource} />
    </div>
  );
}

export function ResourceDetail() {
  const { resourceType = '', id = '' } = useParams();
  const { baseUrl, token } = useServer();

  const query = useQuery<AnyResource>({
    queryKey: ['resource', baseUrl, resourceType, id, token],
    queryFn: () => fhirClient.read<AnyResource>(baseUrl, resourceType, id, token || undefined),
    enabled: !!baseUrl && !!resourceType && !!id,
    retry: false,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          to={`/explore/${resourceType}`}
          className="rounded-pill font-mono font-medium text-link transition-colors hover:text-link-hover"
        >
          ← {resourceType}
        </Link>
        <span className="text-ink-3">/</span>
        <Badge tone="cyan">{resourceType}</Badge>
        <span className="font-mono text-xs text-ink-3">{id}</span>
        {resourceType === 'Patient' && (
          <Link
            to={`/explore/Patient/${id}/dossier`}
            className="ml-auto rounded-pill bg-accent-weak px-3 py-1 font-mono text-xs text-accent-text transition-colors hover:bg-accent hover:text-accent-ink"
          >
            view dossier →
          </Link>
        )}
      </div>

      {query.isLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      )}

      {query.isError && <ErrorMessage error={query.error} />}

      {query.isSuccess && (
        <motion.div
          // Both panes share this height, so they align — each scrolls its own
          // overflow rather than the taller one stretching the row.
          className="grid grid-cols-1 gap-4 lg:h-[70vh] lg:grid-cols-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <section className="card scrollbar-thin max-h-[70vh] overflow-y-auto lg:h-full lg:max-h-none">
            <HumanReadable resource={query.data} />
          </section>
          <section className="card flex max-h-[70vh] min-h-0 flex-col lg:h-full lg:max-h-none">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <p className="label-mono">raw json</p>
              <CopyButton text={JSON.stringify(query.data, null, 2)} label="Copy JSON" />
            </div>
            <div className="min-h-0 flex-1 p-3">
              <JsonView value={query.data} />
            </div>
          </section>
        </motion.div>
      )}

      {query.isSuccess && (
        <motion.section
          className="card"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
        >
          <ReferenceGraph resource={query.data} />
        </motion.section>
      )}

      {query.isSuccess && (
        <motion.section
          className="card"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: 0.09 }}
        >
          <VersionScrubber resourceType={resourceType} id={id} />
        </motion.section>
      )}
    </div>
  );
}
