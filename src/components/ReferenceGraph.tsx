/**
 * A radial map of one resource's place in the FHIR graph.
 *
 * Direction is encoded spatially:
 *   · right arc  — resources THIS one points to (from its own References)
 *   · left arc   — resources that point AT this one (via `_revinclude`, opt-in)
 *
 * Pure SVG on a fixed viewBox, so it scales without measuring the DOM.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServer } from '../context/ServerContext';
import { extractReferences, navigableTargets } from '../fhir/references';
import { useIncomingReferences } from '../hooks/useIncomingReferences';
import type { AnyResource } from '../fhir/types';
import { DelayedSpinner } from './ui/primitives';

const W = 640;
const H = 360;
const CX = W / 2;
const CY = H / 2;
// Elliptical arc — a circular radius in a wide viewBox pushes nodes above and
// below the centre instead of out to the sides, losing the left/right meaning.
const RX = 215;
const RY = 130;
const MAX_PER_SIDE = 7;

interface GraphNode {
  resourceType: string;
  id: string;
  label?: string;
  x: number;
  y: number;
}

/** Lay nodes out along an arc centred on `centreDeg`. */
function arcLayout(
  items: { resourceType: string; id: string; label?: string }[],
  centreDeg: number,
  spreadDeg: number,
): GraphNode[] {
  const n = items.length;
  return items.map((item, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const deg = centreDeg - spreadDeg / 2 + t * spreadDeg;
    const rad = (deg * Math.PI) / 180;
    return {
      ...item,
      x: CX + Math.cos(rad) * RX,
      y: CY + Math.sin(rad) * RY,
    };
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function Node({
  node,
  onOpen,
  tone,
}: {
  node: GraphNode;
  onOpen: () => void;
  tone: 'outbound' | 'inbound';
}) {
  const w = 118;
  const h = 36;
  return (
    <g
      transform={`translate(${node.x - w / 2}, ${node.y - h / 2})`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`${node.resourceType} ${node.id}`}
      className="cursor-pointer focus:outline-none [&:focus-visible>rect]:stroke-[var(--color-focus)] [&:hover>rect]:stroke-[var(--color-accent)]"
    >
      <rect
        width={w}
        height={h}
        rx="12"
        fill={tone === 'inbound' ? 'var(--color-accent-2-weak)' : 'var(--color-paper)'}
        stroke="var(--color-rule)"
        strokeWidth="1.5"
      />
      <text
        x={w / 2}
        y={15}
        textAnchor="middle"
        className="fill-[var(--color-ink)] font-display"
        style={{ fontSize: 11, fontWeight: 500 }}
      >
        {truncate(node.resourceType, 16)}
      </text>
      <text
        x={w / 2}
        y={28}
        textAnchor="middle"
        className="fill-[var(--color-ink-3)]"
        style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
      >
        {truncate(node.label || node.id, 17)}
      </text>
    </g>
  );
}

export function ReferenceGraph({ resource }: { resource: AnyResource }) {
  const { baseUrl, token } = useServer();
  const navigate = useNavigate();
  const [wantIncoming, setWantIncoming] = useState(false);

  const outboundAll = useMemo(
    () => navigableTargets(extractReferences(resource, baseUrl)),
    [resource, baseUrl],
  );

  const incoming = useIncomingReferences(
    baseUrl,
    resource.resourceType,
    resource.id ?? '',
    token,
    wantIncoming,
  );

  const outbound = useMemo(
    () =>
      arcLayout(
        outboundAll.slice(0, MAX_PER_SIDE).map((t) => ({
          resourceType: t.resourceType,
          id: t.id,
          label: t.label || undefined,
        })),
        0,
        outboundAll.length > 1 ? 120 : 0,
      ),
    [outboundAll],
  );

  const inboundAll = incoming.data?.items ?? [];
  const inbound = useMemo(
    () => arcLayout(inboundAll.slice(0, MAX_PER_SIDE), 180, inboundAll.length > 1 ? 120 : 0),
    [inboundAll],
  );

  const centreLabel = truncate(resource.resourceType, 18);
  const centreId = truncate(resource.id ?? '', 18);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-5 py-4">
        <p className="label-mono">reference graph</p>
        <div className="flex items-center gap-3 font-mono text-xs text-ink-2">
          <span>{outboundAll.length} outgoing</span>
          {!wantIncoming ? (
            <button
              type="button"
              onClick={() => setWantIncoming(true)}
              className="btn btn--soft !px-3 !py-1 !font-mono !text-xs"
            >
              find incoming
            </button>
          ) : incoming.isLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <DelayedSpinner className="h-3 w-3" /> searching
            </span>
          ) : incoming.isError ? (
            <span className="text-ink-3">incoming unsupported</span>
          ) : (
            <span>
              {inboundAll.length} incoming
              {incoming.data?.method === 'patient-search' && (
                <span className="ml-1 text-ink-3">(via patient search)</span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Reference graph for ${resource.resourceType} ${resource.id ?? ''}`}
        >
          <defs>
            <marker
              id="arrow-out"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--color-ink-3)" />
            </marker>
          </defs>

          {/* Edges first so nodes sit on top. */}
          {outbound.map((n) => (
            <line
              key={`e-out-${n.resourceType}-${n.id}`}
              x1={CX + 62}
              y1={CY}
              x2={n.x - 60}
              y2={n.y}
              stroke="var(--color-rule)"
              strokeWidth="1"
              markerEnd="url(#arrow-out)"
            />
          ))}
          {inbound.map((n) => (
            <line
              key={`e-in-${n.resourceType}-${n.id}`}
              x1={n.x + 60}
              y1={n.y}
              x2={CX - 62}
              y2={CY}
              stroke="var(--color-rule)"
              strokeWidth="1"
              strokeDasharray="3 3"
              markerEnd="url(#arrow-out)"
            />
          ))}

          {/* Centre: the resource we're looking at. */}
          <g transform={`translate(${CX - 62}, ${CY - 22})`}>
            <rect
              width="124"
              height="44"
              rx="14"
              fill="var(--color-accent)"
              stroke="var(--color-accent-deep)"
              strokeWidth="2"
            />
            <text
              x="62"
              y="19"
              textAnchor="middle"
              className="fill-[var(--color-ink)] font-display"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              {centreLabel}
            </text>
            <text
              x="62"
              y="33"
              textAnchor="middle"
              className="fill-[var(--color-ink-2)]"
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
            >
              {centreId}
            </text>
          </g>

          {outbound.map((n) => (
            <Node
              key={`n-out-${n.resourceType}-${n.id}`}
              node={n}
              tone="outbound"
              onOpen={() => navigate(`/${n.resourceType}/${n.id}`)}
            />
          ))}
          {inbound.map((n) => (
            <Node
              key={`n-in-${n.resourceType}-${n.id}`}
              node={n}
              tone="inbound"
              onOpen={() => navigate(`/${n.resourceType}/${n.id}`)}
            />
          ))}
        </svg>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-2 font-mono text-xs text-ink-3">
          <span>← solid: this points to</span>
          <span>⇠ dashed: points at this</span>
          {outboundAll.length > MAX_PER_SIDE && (
            <span className="text-ink-2">
              +{outboundAll.length - MAX_PER_SIDE} more outgoing not drawn
            </span>
          )}
          {inboundAll.length > MAX_PER_SIDE && (
            <span className="text-ink-2">
              +{inboundAll.length - MAX_PER_SIDE} more incoming not drawn
            </span>
          )}
        </div>

        {wantIncoming && incoming.data?.inconclusive && (
          <p className="mt-2 px-2 text-xs text-ink-2">
            No incoming references found. This server may not support{' '}
            <code className="font-mono text-ink">_revinclude=*</code>
            {resource.resourceType !== 'Patient'
              ? ', and reverse search by subject is only available for Patient resources'
              : ''}
            , so this may be a server limitation rather than a genuine absence.
          </p>
        )}

        {outboundAll.length === 0 && (
          <p className="mt-2 px-2 text-xs text-ink-2">
            This resource contains no navigable references.
          </p>
        )}
      </div>
    </div>
  );
}
