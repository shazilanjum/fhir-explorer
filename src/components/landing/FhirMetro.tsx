/*
 * Hallmark · pre-emit critique: P5 H4 E4 S5 R4 V5
 * Macrostructure: Map / Diagram. Audience: FHIR developers and curious newcomers.
 * Use: connect to a server, understand its surface area, and enter a resource route.
 * Tone: playful technical wonder. Enrichment: Tier-B hand-built SVG transit map.
 * Nav: N13 inline command pill. Footer: Ft2 compact status-and-theme utility strip.
 * Theme: the existing Hum · Lumen · Manifesto · Terminal system remains authoritative.
 * Handoff: contrast pass (40–41) · slop pass (42–45) · honest/chrome/tokens pass (46–48)
 * Responsive/mobile: pass (34, 49–57) · icons pass (30).
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useServer } from '../../context/ServerContext';
import type { CapabilityStatement, CapabilityStatementResource } from '../../fhir/types';
import { useCapabilityStatement } from '../../hooks/useFhir';
import { DelayedSpinner } from '../ui/primitives';
import { openCommandPalette } from '../CommandPalette';
import { ExperienceSettings } from '../ExperienceSettings';

type LineId = 'clinical' | 'care' | 'medication' | 'people' | 'terminology' | 'financial';

interface MetroLine {
  id: LineId;
  name: string;
  shortName: string;
  color: string;
  path: string;
  dash?: string;
}

interface Station {
  type: string;
  line: LineId;
  x: number;
  y: number;
  dx: number;
  dy: number;
  anchor?: 'start' | 'middle' | 'end';
}

const METRO_LINES: MetroLine[] = [
  {
    id: 'clinical',
    name: 'Clinical records',
    shortName: 'Clinical',
    color: 'var(--color-accent-2)',
    path: 'M70 150H300Q330 150 330 180V215H720Q760 215 760 175V150H1130',
  },
  {
    id: 'care',
    name: 'Care & workflow',
    shortName: 'Care',
    color: 'var(--color-accent-deep)',
    path: 'M90 350H270Q310 350 310 315V285H600Q640 285 640 320V350H1110',
  },
  {
    id: 'medication',
    name: 'Medication loop',
    shortName: 'Medication',
    color: 'var(--color-accent-3)',
    path: 'M90 520H300V465H520V415H750V465H970V520H1120',
  },
  {
    id: 'people',
    name: 'People & places',
    shortName: 'People',
    color: 'var(--color-lavender)',
    path: 'M210 70V625',
    dash: '2 10',
  },
  {
    id: 'terminology',
    name: 'Terminology',
    shortName: 'Terminology',
    color: 'var(--color-mint)',
    path: 'M880 70V625',
    dash: '12 7',
  },
  {
    id: 'financial',
    name: 'Coverage & claims',
    shortName: 'Financial',
    color: 'var(--color-ink-3)',
    path: 'M80 635H1120',
    dash: '18 7',
  },
];

const STATIONS: Station[] = [
  { type: 'Patient', line: 'clinical', x: 120, y: 150, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'Encounter', line: 'clinical', x: 260, y: 150, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'Observation', line: 'clinical', x: 330, y: 215, dx: 0, dy: 28, anchor: 'middle' },
  { type: 'Condition', line: 'clinical', x: 500, y: 215, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'DiagnosticReport', line: 'clinical', x: 675, y: 215, dx: 0, dy: 28, anchor: 'middle' },
  { type: 'Procedure', line: 'clinical', x: 760, y: 150, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'AllergyIntolerance', line: 'clinical', x: 930, y: 150, dx: 0, dy: 28, anchor: 'middle' },
  { type: 'Immunization', line: 'clinical', x: 1090, y: 150, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'Appointment', line: 'care', x: 120, y: 350, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'ServiceRequest', line: 'care', x: 270, y: 350, dx: 0, dy: 28, anchor: 'middle' },
  { type: 'CarePlan', line: 'care', x: 400, y: 285, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'CareTeam', line: 'care', x: 560, y: 285, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'Task', line: 'care', x: 640, y: 350, dx: 0, dy: 28, anchor: 'middle' },
  { type: 'Communication', line: 'care', x: 820, y: 350, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'Questionnaire', line: 'care', x: 990, y: 350, dx: 0, dy: 28, anchor: 'middle' },
  { type: 'QuestionnaireResponse', line: 'care', x: 1110, y: 350, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'Medication', line: 'medication', x: 150, y: 520, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'MedicationRequest', line: 'medication', x: 300, y: 465, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'MedicationDispense', line: 'medication', x: 520, y: 415, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'MedicationAdministration', line: 'medication', x: 750, y: 465, dx: 0, dy: 28, anchor: 'middle' },
  { type: 'MedicationStatement', line: 'medication', x: 970, y: 520, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'Practitioner', line: 'people', x: 210, y: 85, dx: 18, dy: 5 },
  { type: 'PractitionerRole', line: 'people', x: 210, y: 260, dx: 18, dy: 5 },
  { type: 'Organization', line: 'people', x: 210, y: 410, dx: 18, dy: 5 },
  { type: 'Location', line: 'people', x: 210, y: 590, dx: 18, dy: 5 },
  { type: 'CodeSystem', line: 'terminology', x: 880, y: 85, dx: 18, dy: 5 },
  { type: 'ValueSet', line: 'terminology', x: 880, y: 250, dx: 18, dy: 5 },
  { type: 'ConceptMap', line: 'terminology', x: 880, y: 435, dx: 18, dy: 5 },
  { type: 'StructureDefinition', line: 'terminology', x: 880, y: 590, dx: 18, dy: 5 },
  { type: 'Coverage', line: 'financial', x: 130, y: 635, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'Claim', line: 'financial', x: 360, y: 635, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'ClaimResponse', line: 'financial', x: 570, y: 635, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'ExplanationOfBenefit', line: 'financial', x: 810, y: 635, dx: 0, dy: -18, anchor: 'middle' },
  { type: 'PaymentReconciliation', line: 'financial', x: 1060, y: 635, dx: 0, dy: -18, anchor: 'middle' },
];

const LINE_BY_ID = new Map(METRO_LINES.map((line) => [line.id, line]));

function getResources(data: CapabilityStatement | undefined) {
  return data?.rest?.flatMap((rest) => rest.resource ?? []) ?? [];
}

function normalizeServerUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function displayHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none">
      <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DesktopMap({
  resourcesByType,
  selected,
  onSelect,
  softwareName,
  resourceCount,
}: {
  resourcesByType: Map<string, CapabilityStatementResource>;
  selected: string;
  onSelect: (type: string) => void;
  softwareName: string;
  resourceCount: number;
}) {
  const reduceMotion = useReducedMotion();
  const visibleStations = STATIONS.filter((station) => resourcesByType.has(station.type));

  return (
    <div className="relative hidden min-h-[34rem] overflow-hidden lg:block" aria-label="FHIR resource metro map">
      <svg viewBox="0 0 1200 700" className="h-full min-h-[34rem] w-full" role="img">
        <title>FHIR resources available on this server, arranged as metro lines</title>
        <desc>Select a station to inspect the resource and open it in the explorer.</desc>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {METRO_LINES.map((line, index) => {
            const active = visibleStations.some((station) => station.line === line.id);
            return (
              <motion.path
                key={line.id}
                d={line.path}
                stroke={line.color}
                strokeWidth="7"
                strokeDasharray={line.dash}
                opacity={active ? 0.9 : 0.16}
                initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: active ? 0.9 : 0.16 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.65, delay: index * 0.055, ease: [0.16, 1, 0.3, 1] }}
              />
            );
          })}
        </g>

        <g transform="translate(486 56)">
          <rect width="228" height="72" rx="var(--radius-card)" fill="var(--color-paper)" stroke="var(--color-rule)" />
          <circle cx="22" cy="24" r="5" fill="var(--color-accent)" stroke="var(--color-accent-deep)" strokeWidth="2" />
          <text x="38" y="29" fill="var(--color-ink)" fontFamily="var(--font-body)" fontSize="16" fontWeight="650">
            {softwareName.slice(0, 22)}
          </text>
          <text x="22" y="54" fill="var(--color-ink-2)" fontFamily="var(--font-mono)" fontSize="13">
            CENTRAL · {resourceCount} ROUTES
          </text>
        </g>

        {visibleStations.map((station, index) => {
          const line = LINE_BY_ID.get(station.line)!;
          const isSelected = selected === station.type;
          return (
            <motion.a
              key={station.type}
              href={`/${station.type}`}
              onClick={(event) => {
                event.preventDefault();
                onSelect(station.type);
              }}
              aria-label={`${station.type} station on the ${line.name} line`}
              aria-current={isSelected ? 'true' : undefined}
              className="group cursor-pointer outline-none"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.26, delay: Math.min(0.25 + index * 0.018, 0.7) }}
            >
              <circle cx={station.x} cy={station.y} r="24" fill="transparent" />
              <circle
                cx={station.x}
                cy={station.y}
                r={isSelected ? 8 : 6}
                fill={isSelected ? line.color : 'var(--color-paper)'}
                stroke={line.color}
                strokeWidth={isSelected ? 4 : 3}
              />
              <circle
                cx={station.x}
                cy={station.y}
                r="14"
                fill="none"
                stroke="var(--color-focus)"
                strokeWidth="2"
                opacity="0"
                className="group-focus-visible:opacity-100"
              />
              <text
                x={station.x + station.dx}
                y={station.y + station.dy}
                textAnchor={station.anchor ?? 'start'}
                fill={isSelected ? 'var(--color-ink)' : 'var(--color-ink-2)'}
                fontFamily="var(--font-mono)"
                fontSize="15"
                fontWeight={isSelected ? 700 : 500}
                className="select-none group-hover:fill-[var(--color-ink)]"
              >
                {station.type}
              </text>
            </motion.a>
          );
        })}
      </svg>
    </div>
  );
}

function MobileMap({ resourcesByType, selected, onSelect }: {
  resourcesByType: Map<string, CapabilityStatementResource>;
  selected: string;
  onSelect: (type: string) => void;
}) {
  return (
    <div className="space-y-6 p-4 lg:hidden" aria-label="FHIR resource routes">
      {METRO_LINES.map((line) => {
        const stations = STATIONS.filter(
          (station) => station.line === line.id && resourcesByType.has(station.type),
        );
        if (!stations.length) return null;
        return (
          <section key={line.id} aria-labelledby={`line-${line.id}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-6 shrink-0 rounded-pill" style={{ backgroundColor: line.color }} />
              <h3 id={`line-${line.id}`} className="font-mono text-xs uppercase tracking-wide text-ink-2">{line.name}</h3>
            </div>
            <div className="ml-3 border-l-2 pl-4" style={{ borderColor: line.color }}>
              {stations.map((station) => {
                const isSelected = selected === station.type;
                return (
                  <button
                    key={station.type}
                    type="button"
                    onClick={() => onSelect(station.type)}
                    aria-pressed={isSelected}
                    className={`relative flex min-h-11 w-full items-center truncate border-b border-rule px-2 text-left font-mono text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:bg-paper-3 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected ? 'bg-paper-3 font-bold text-ink' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                    }`}
                    title={station.type}
                  >
                    <span className="absolute -left-6 h-4 w-4 rounded-full border-2 bg-paper" style={{ borderColor: line.color }} aria-hidden="true" />
                    <span className="truncate">{station.type}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StationDetail({ station, resource }: {
  station: Station | undefined;
  resource: CapabilityStatementResource | undefined;
}) {
  const reduceMotion = useReducedMotion();
  if (!station || !resource) {
    return <div className="flex h-full min-h-52 items-center p-6 text-sm text-ink-3">Select a station to inspect its route.</div>;
  }

  const line = LINE_BY_ID.get(station.line)!;
  const interactions = resource.interaction?.map((item) => item.code) ?? [];
  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={station.type}
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        className="flex h-full min-h-52 flex-col p-5 sm:p-6"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-ink-2">
          <span className="h-2.5 w-6 rounded-pill" style={{ backgroundColor: line.color }} />
          {line.name}
        </div>
        <h2 className="mt-5 break-words text-2xl text-ink">{station.type}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          {resource.profile ? 'This route advertises a server profile.' : 'This route uses the base FHIR profile.'}
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-rule py-4 font-mono text-xs">
          <div><dt className="text-ink-3">INTERACTIONS</dt><dd className="mt-1 text-ink">{interactions.length || '—'}</dd></div>
          <div><dt className="text-ink-3">SEARCH KEYS</dt><dd className="mt-1 text-ink">{resource.searchParam?.length ?? 0}</dd></div>
        </dl>
        {interactions.length > 0 && <p className="mt-4 line-clamp-3 font-mono text-xs leading-relaxed text-ink-3">{interactions.join(' · ')}</p>}
        <Link to={`/${station.type}`} className="btn mt-auto min-h-11 w-full">
          Open resource <span aria-hidden="true">→</span>
        </Link>
      </motion.aside>
    </AnimatePresence>
  );
}

export function FhirMetro() {
  const reduceMotion = useReducedMotion();
  const { baseUrl, connect, token } = useServer();
  const [draftUrl, setDraftUrl] = useState(baseUrl);
  const [committedUrl, setCommittedUrl] = useState(baseUrl);
  const [selected, setSelected] = useState('Patient');
  const capability = useCapabilityStatement(committedUrl, token);

  const resources = useMemo(() => getResources(capability.data), [capability.data]);
  const resourcesByType = useMemo(() => new Map(resources.map((resource) => [resource.type, resource])), [resources]);
  const supportedStations = useMemo(() => STATIONS.filter((station) => resourcesByType.has(station.type)), [resourcesByType]);

  useEffect(() => {
    if (capability.isSuccess) connect(committedUrl);
  }, [capability.isSuccess, committedUrl, connect]);

  useEffect(() => {
    if (supportedStations.length && !resourcesByType.has(selected)) setSelected(supportedStations[0].type);
  }, [resourcesByType, selected, supportedStations]);

  const selectedStation = STATIONS.find((station) => station.type === selected);
  const selectedResource = resourcesByType.get(selected);
  const mappedCount = supportedStations.length;
  const hiddenCount = Math.max(0, resources.length - mappedCount);
  const softwareName = capability.data?.software?.name || 'FHIR server';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeServerUrl(draftUrl);
    if (normalized) setCommittedUrl(normalized);
  }

  return (
    <div className="min-h-svh bg-paper-2 text-ink">
      <header className="mx-auto flex max-w-[96rem] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/welcome" className="flex min-h-11 items-center gap-2 rounded-input px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent ring-2 ring-accent-deep/40" />
          <span className="font-display font-bold tracking-tight">fhir</span>
          <span className="hidden text-ink-3 sm:inline">metro</span>
        </Link>
        <div className="flex items-center gap-2">
          <ExperienceSettings />
          <button type="button" onClick={openCommandPalette} className="flex min-h-11 items-center gap-2 rounded-pill border border-rule bg-paper px-3 text-sm text-ink-2 outline-none transition-colors hover:bg-paper-3 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus" aria-label="Search resources and commands">
            <SearchIcon /><span className="hidden sm:inline">Search resources</span><kbd className="hidden rounded-input bg-paper-3 px-1.5 py-0.5 font-mono text-xs text-ink-3 lg:inline">⌘K</kbd>
          </button>
          <Link to="/" aria-label="Open explorer" className="btn btn--soft min-h-11"><span className="hidden sm:inline">Open explorer</span><span aria-hidden="true">→</span></Link>
        </div>
      </header>

      <main className="mx-auto max-w-[96rem] px-4 pb-6 sm:px-6 lg:px-8">
        <section className="grid gap-7 border-y border-rule pb-12 pt-8 sm:pb-14 sm:pt-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(32rem,1.2fr)] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-ink-2">FHIR RESOURCE TRANSIT</p>
            <h1 className="mt-3 max-w-2xl text-4xl leading-[1.04] text-ink sm:text-5xl lg:text-6xl">Every resource has a route.</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">Connect a FHIR server. Its CapabilityStatement draws the network; you choose the next stop.</p>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="min-w-0">
              <span className="mb-2 block font-mono text-xs uppercase tracking-wide text-ink-2">FHIR server</span>
              <input type="url" required value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} className="h-12 w-full min-w-0 rounded-input border border-rule bg-paper px-4 font-mono text-sm text-ink outline outline-2 outline-transparent transition-colors placeholder:text-ink-3 hover:border-rule-2 focus-visible:outline-focus" aria-describedby="server-status" spellCheck={false} />
            </label>
            <button type="submit" className="btn h-12 min-w-32" disabled={capability.isFetching}>
              {capability.isFetching && <DelayedSpinner className="h-4 w-4" />}{capability.isFetching ? 'Building map' : 'Build map'}
            </button>
            <div id="server-status" className="min-h-5 text-xs sm:col-span-2" aria-live="polite">
              {capability.isError ? <p className="text-danger">Could not read /metadata. Check the URL, CORS access, or your session token.</p> : capability.isSuccess ? <p className="font-mono text-ink-3">{displayHost(committedUrl)} · FHIR {capability.data.fhirVersion ?? 'version unknown'} · {resources.length} resources</p> : null}
            </div>
          </form>
        </section>

        <section className="py-7" aria-labelledby="metro-map-title">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><h2 id="metro-map-title" className="text-xl text-ink sm:text-2xl">Server map</h2><p className="mt-1 text-sm text-ink-2">Pick a station to see what this server lets you do there.</p></div>
            <div className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Metro line legend">
              {METRO_LINES.map((line) => (
                <span key={line.id} className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-xs text-ink-2">
                  <span className="h-1 w-5 rounded-pill" style={{ backgroundColor: line.dash ? 'transparent' : line.color, borderTop: line.dash ? `2px dashed ${line.color}` : undefined }} aria-hidden="true" />{line.shortName}
                </span>
              ))}
            </div>
          </div>

          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden rounded-card border border-rule bg-paper shadow-card">
            {capability.isFetching && !capability.data ? (
              <div className="flex min-h-[28rem] items-center justify-center p-8 text-center"><div><DelayedSpinner className="mx-auto h-6 w-6 text-accent-deep" /><p className="mt-4 font-mono text-sm text-ink-2">Reading /metadata and laying track…</p></div></div>
            ) : capability.isError ? (
              <div className="flex min-h-[28rem] items-center justify-center p-8 text-center"><div className="max-w-md"><p className="font-display text-xl text-ink">The network could not be drawn.</p><p className="mt-2 text-sm leading-relaxed text-ink-2">Try a public R4 endpoint or a server that permits browser requests, then build the map again.</p></div></div>
            ) : (
              <div className="grid min-[1360px]:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="min-w-0 bg-paper-2"><DesktopMap resourcesByType={resourcesByType} selected={selected} onSelect={setSelected} softwareName={softwareName} resourceCount={resources.length} /><MobileMap resourcesByType={resourcesByType} selected={selected} onSelect={setSelected} /></div>
                <div className="border-t border-rule min-[1360px]:border-l min-[1360px]:border-t-0"><StationDetail station={selectedStation} resource={selectedResource} /></div>
              </div>
            )}
          </motion.div>

          {capability.isSuccess && (
            <div className="mt-4 flex flex-col justify-between gap-3 border-b border-rule pb-5 text-sm text-ink-2 sm:flex-row sm:items-center">
              <p>Showing <strong className="font-semibold text-ink">{mappedCount}</strong> landmark stations{hiddenCount > 0 ? ` · ${hiddenCount} more routes live in search` : ''}.</p>
              <button type="button" onClick={openCommandPalette} className="inline-flex min-h-11 items-center gap-2 self-start whitespace-nowrap rounded-input px-1 font-mono text-sm text-link outline-none hover:text-link-hover focus-visible:ring-2 focus-visible:ring-focus sm:self-auto">Find any resource <span aria-hidden="true">⌘K</span></button>
            </div>
          )}
        </section>
      </main>

      <footer className="mx-auto flex max-w-[96rem] items-center justify-between gap-4 border-t border-rule px-4 py-5 sm:px-6 lg:px-8">
        <p className="font-mono text-xs text-ink-3">{capability.isSuccess ? `${displayHost(committedUrl)} · network live` : 'Waiting for a reachable FHIR endpoint'}</p>
        <p className="hidden text-sm text-ink-3 sm:block">Routes are generated from the live CapabilityStatement.</p>
      </footer>
    </div>
  );
}
