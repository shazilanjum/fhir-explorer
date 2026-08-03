/*
 * Hallmark · pre-emit critique: P5 H4 E4 S5 R4 V5
 * Macrostructure: Stat-Led · tone: playful technical wonder · anchor: live resource count.
 * Enrichment: E5 Custom Illustration Centerpiece · Tier-A CSS orrery · manual time scrub.
 * Nav: N7 Brutal slab · footer: Ft5 Statement · theme: locked four-theme system.
 * Handoff: contrast pass (40-41) / slop pass (42-45) / honest, chrome, tokens, and icons pass (30, 46-48).
 * Responsive: pass (34, 49-57) / global html/body overflow-x: clip retained.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useServer } from '../../context/ServerContext';
import type { CapabilityStatement, CapabilityStatementResource } from '../../fhir/types';
import { useCapabilityStatement } from '../../hooks/useFhir';
import { openCommandPalette } from '../CommandPalette';
import { ExperienceSettings } from '../ExperienceSettings';
import { DelayedSpinner } from '../ui/primitives';

type OrbitId = 'clinical' | 'workflow' | 'medication' | 'foundation';

interface OrbitDefinition {
  id: OrbitId;
  name: string;
  color: string;
  radius: number;
  offset: number;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  resources: string[];
}

interface Planet {
  orbit: OrbitDefinition;
  resource: CapabilityStatementResource;
  angle: number;
}

const ORBITS: OrbitDefinition[] = [
  {
    id: 'clinical',
    name: 'Clinical core',
    color: 'var(--color-accent-2)',
    radius: 18,
    offset: 4,
    borderStyle: 'solid',
    resources: ['Patient', 'Encounter', 'Observation', 'Condition'],
  },
  {
    id: 'workflow',
    name: 'Care workflow',
    color: 'var(--color-accent-deep)',
    radius: 26,
    offset: 38,
    borderStyle: 'dashed',
    resources: ['Appointment', 'ServiceRequest', 'CarePlan', 'Task'],
  },
  {
    id: 'medication',
    name: 'Medication',
    color: 'var(--color-accent-3)',
    radius: 34,
    offset: 76,
    borderStyle: 'dotted',
    resources: ['Medication', 'MedicationRequest', 'MedicationDispense', 'MedicationAdministration'],
  },
  {
    id: 'foundation',
    name: 'People & terminology',
    color: 'var(--color-lavender)',
    radius: 42,
    offset: 112,
    borderStyle: 'dashed',
    resources: ['Practitioner', 'Organization', 'CodeSystem', 'ValueSet'],
  },
];

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

function planetCode(type: string) {
  const capitals = type.match(/[A-Z]/g)?.join('') ?? '';
  return (capitals.length > 1 ? capitals : type.slice(0, 2)).slice(0, 2).toUpperCase();
}

function planetSize(resource: CapabilityStatementResource) {
  const searchKeys = resource.searchParam?.length ?? 0;
  if (searchKeys >= 40) return 56;
  if (searchKeys >= 24) return 52;
  if (searchKeys >= 12) return 48;
  return 44;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none">
      <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Orrery({
  planets,
  phase,
  selected,
  onSelect,
  host,
  resourceCount,
}: {
  planets: Planet[];
  phase: number;
  selected: string;
  onSelect: (type: string) => void;
  host: string;
  resourceCount: number;
}) {
  return (
    <figure className="mx-auto w-full max-w-[42rem]" aria-labelledby="orrery-caption">
      <div
        className="relative aspect-square w-full overflow-hidden rounded-card border-2 border-rule bg-paper"
        role="group"
        aria-label={`Interactive FHIR orrery showing ${planets.length} landmark resources from ${host}`}
      >
        <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-rule/60" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-rule/60" aria-hidden="true" />

        {ORBITS.map((orbit) => (
          <div
            key={orbit.id}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-2 opacity-70"
            style={{
              width: `${orbit.radius * 2}%`,
              height: `${orbit.radius * 2}%`,
              borderColor: orbit.color,
              borderStyle: orbit.borderStyle,
              transform: 'translate(-50%, -50%)',
            }}
            aria-hidden="true"
          />
        ))}

        <div className="absolute left-1/2 top-1/2 flex aspect-square w-[16%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-ink bg-accent text-center text-accent-ink shadow-card">
          <span className="font-display text-sm font-bold sm:text-base">FHIR</span>
          <span className="font-mono text-[10px] font-bold sm:text-xs">{resourceCount}</span>
        </div>

        {planets.map((planet) => {
          const angle = ((planet.angle + phase) * Math.PI) / 180;
          const left = 50 + planet.orbit.radius * Math.cos(angle);
          const top = 50 + planet.orbit.radius * Math.sin(angle);
          const size = planetSize(planet.resource);
          const isSelected = selected === planet.resource.type;
          return (
            <button
              key={planet.resource.type}
              type="button"
              onClick={() => onSelect(planet.resource.type)}
              aria-pressed={isSelected}
              aria-label={`${planet.resource.type}, ${planet.orbit.name} orbit, ${planet.resource.searchParam?.length ?? 0} search parameters`}
              title={planet.resource.type}
              className={`absolute flex items-center justify-center rounded-full border-2 font-mono text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:bg-paper-3 disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected ? 'z-10 bg-ink text-paper' : 'bg-paper text-ink hover:bg-paper-3'
              }`}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                borderColor: planet.orbit.color,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {planetCode(planet.resource.type)}
            </button>
          );
        })}

        {planets.length === 0 && (
          <p className="absolute bottom-8 left-1/2 w-4/5 -translate-x-1/2 text-center text-sm text-ink-2">
            Connect a reachable server to place its resources in orbit.
          </p>
        )}
      </div>

      <figcaption id="orrery-caption" className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {ORBITS.map((orbit) => (
          <span key={orbit.id} className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-xs text-ink-2">
            <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: orbit.color }} aria-hidden="true" />
            {orbit.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function FhirOrrery() {
  const { baseUrl, connect, token } = useServer();
  const [draftUrl, setDraftUrl] = useState(baseUrl);
  const [committedUrl, setCommittedUrl] = useState(baseUrl);
  const [phase, setPhase] = useState(0);
  const [selected, setSelected] = useState('Patient');
  const capability = useCapabilityStatement(committedUrl, token);

  const resources = useMemo(() => getResources(capability.data), [capability.data]);
  const resourcesByType = useMemo(
    () => new Map(resources.map((resource) => [resource.type, resource])),
    [resources],
  );
  const planets = useMemo(
    () =>
      ORBITS.flatMap((orbit) => {
        const supported = orbit.resources
          .map((type) => resourcesByType.get(type))
          .filter((resource): resource is CapabilityStatementResource => Boolean(resource));
        return supported.map((resource, index) => ({
          orbit,
          resource,
          angle: orbit.offset + (360 / Math.max(1, supported.length)) * index,
        }));
      }),
    [resourcesByType],
  );

  useEffect(() => {
    if (capability.isSuccess) connect(committedUrl);
  }, [capability.isSuccess, committedUrl, connect]);

  useEffect(() => {
    if (planets.length && !resourcesByType.has(selected)) setSelected(planets[0].resource.type);
  }, [planets, resourcesByType, selected]);

  const selectedPlanet = planets.find((planet) => planet.resource.type === selected);
  const selectedResource = selectedPlanet?.resource;
  const interactions = selectedResource?.interaction?.map((item) => item.code) ?? [];
  const host = displayHost(committedUrl);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeServerUrl(draftUrl);
    if (!normalized) return;
    if (normalized === committedUrl) {
      void capability.refetch();
    } else {
      setCommittedUrl(normalized);
    }
  }

  return (
    <div className="min-h-svh bg-paper-2 text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-paper px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/welcome?mode=orrery" className="flex min-h-11 items-center gap-2 whitespace-nowrap font-display font-extrabold uppercase tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <span className="h-3 w-3 bg-pop" aria-hidden="true" />
          FHIR Orrery
        </Link>
        <div className="flex items-center gap-2">
          <ExperienceSettings />
          <button type="button" onClick={openCommandPalette} className="flex min-h-11 items-center gap-2 border-2 border-ink bg-paper px-3 font-mono text-xs uppercase tracking-wide text-ink outline-none transition-colors hover:bg-paper-3 focus-visible:ring-2 focus-visible:ring-focus active:translate-y-px" aria-label="Search resources and commands">
            <SearchIcon /><span className="hidden lg:inline">Search</span>
          </button>
          <Link to="/" aria-label="Open explorer" className="btn min-h-11 !rounded-none"><span className="hidden sm:inline">Open explorer</span><span aria-hidden="true">→</span></Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid min-h-[72svh] max-w-[96rem] gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:grid-cols-[minmax(18rem,0.65fr)_minmax(0,1.35fr)] lg:items-center lg:px-8">
          <div className="min-w-0">
            <p className="font-mono text-sm text-ink-2">
              {capability.isSuccess ? `${host} · FHIR ${capability.data.fhirVersion ?? 'version unknown'}` : 'Reading the server’s system model'}
            </p>
            <h1 className="mt-5 min-w-0 [overflow-wrap:anywhere] text-ink">
              <span className="block font-mono text-[clamp(5rem,13vw,10rem)] font-bold leading-none tabular-nums" aria-live="polite">
                {capability.isSuccess ? resources.length : '—'}
              </span>
              <span className="mt-3 block max-w-[12ch] text-3xl leading-[1.05] sm:text-4xl lg:text-5xl">resource worlds in motion.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2">
              Orbit size reflects searchable surface area. Drag time to move the system, then choose a world to inspect it.
            </p>

            <div className="mt-8 border-y border-rule py-5">
              {selectedPlanet && selectedResource ? (
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-ink-2">
                    <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: selectedPlanet.orbit.color }} aria-hidden="true" />
                    {selectedPlanet.orbit.name}
                  </div>
                  <h2 className="mt-3 min-w-0 [overflow-wrap:anywhere] text-2xl text-ink">{selectedResource.type}</h2>
                  <div className="mt-4 flex flex-wrap gap-6 font-mono text-xs text-ink-2">
                    <span><strong className="text-ink">{interactions.length}</strong> interactions</span>
                    <span><strong className="text-ink">{selectedResource.searchParam?.length ?? 0}</strong> search keys</span>
                  </div>
                  <Link to={`/${selectedResource.type}`} className="btn btn--soft mt-5 min-h-11">Open resource <span aria-hidden="true">→</span></Link>
                </div>
              ) : (
                <p className="text-sm text-ink-2">Choose a resource world after the server model loads.</p>
              )}
            </div>
          </div>

          <div className="min-w-0">
            {capability.isFetching && !capability.data ? (
              <div className="flex aspect-square w-full max-w-[42rem] items-center justify-center border-2 border-rule bg-paper">
                <div className="text-center"><DelayedSpinner className="mx-auto h-6 w-6 text-accent-deep" /><p className="mt-4 font-mono text-sm text-ink-2">Calculating orbits…</p></div>
              </div>
            ) : (
              <Orrery planets={planets} phase={phase} selected={selected} onSelect={setSelected} host={host} resourceCount={resources.length} />
            )}

            <label className="mx-auto mt-6 block w-full max-w-[42rem]">
              <span className="mb-2 flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-wide text-ink-2"><span>Orbit time</span><span>{phase}°</span></span>
              <input type="range" min="0" max="359" value={phase} onChange={(event) => setPhase(Number(event.target.value))} className="h-11 w-full cursor-ew-resize accent-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" aria-label="Move resources through their orbits" />
            </label>
          </div>
        </section>

        <section className="border-y-2 border-ink bg-paper">
          <form onSubmit={handleSubmit} className="mx-auto grid max-w-[96rem] gap-3 px-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:px-6 lg:px-8">
            <label className="min-w-0">
              <span className="mb-2 block font-mono text-xs uppercase tracking-wide text-ink-2">FHIR server</span>
              <input type="url" required value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} aria-describedby="orrery-server-status" spellCheck={false} className="h-12 w-full min-w-0 rounded-input border border-rule bg-paper-2 px-4 font-mono text-sm text-ink outline outline-2 outline-transparent transition-colors hover:bg-paper-3 focus-visible:outline-focus" />
            </label>
            <button type="submit" className="btn h-12 min-w-36 !rounded-none" disabled={capability.isFetching}>
              {capability.isFetching && <DelayedSpinner className="h-4 w-4" />}{capability.isFetching ? 'Calculating' : 'Rebuild system'}
            </button>
            <div id="orrery-server-status" className="min-h-5 text-xs sm:col-span-2" aria-live="polite">
              {capability.isError ? <p className="text-danger">The metadata endpoint could not be read. Check the URL, CORS access, or session token.</p> : capability.isSuccess ? <p className="font-mono text-ink-3">{resources.length} resource types · {planets.length} landmark worlds shown</p> : null}
            </div>
          </form>
        </section>
      </main>

      <footer className="mx-auto grid max-w-[96rem] gap-8 px-4 pb-8 pt-14 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(24rem,1.2fr)] lg:items-end lg:px-8">
        <p className="max-w-[22ch] font-display text-3xl leading-tight text-ink sm:text-4xl">The server is a system. Now you can see it.</p>
        <div className="flex items-center justify-between gap-4 border-t border-rule pt-4 font-mono text-xs text-ink-3">
          <span>{capability.isSuccess ? `${host} · model live` : 'Waiting for metadata'}</span>
          <span className="hidden sm:inline">16 landmark worlds</span>
        </div>
      </footer>
    </div>
  );
}
