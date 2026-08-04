/**
 * A whole result set (or patient record) as a live force-directed graph:
 * resources are nodes, references are edges, shared targets become hubs. Drag a
 * node to pull the web around, hover to light its connections, click to open.
 *
 * The simulation is hand-rolled (see lib/forceLayout) and renders as SVG so it
 * inherits the theme's tokens like everything else.
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildAdjacency, buildGraphModel } from '../fhir/graphModel';
import { useForceLayout } from '../lib/forceLayout';
import type { AnyResource } from '../fhir/types';

const TYPE_COLOR: Record<string, string> = {
  Patient: 'var(--color-accent)',
  Observation: 'var(--color-link)',
  Encounter: 'var(--color-accent-2)',
  Condition: 'var(--color-accent-3)',
  Procedure: 'var(--color-lavender)',
  MedicationRequest: 'var(--color-mint)',
  Organization: 'var(--color-ink-2)',
  Practitioner: 'var(--color-ink-2)',
};
const color = (t: string) => TYPE_COLOR[t] ?? 'var(--color-ink-3)';

export function Constellation({ resources }: { resources: AnyResource[] }) {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);

  const model = useMemo(() => buildGraphModel(resources), [resources]);
  const adjacency = useMemo(() => buildAdjacency(model.edges), [model.edges]);

  const nodeIds = useMemo(() => model.nodes.map((n) => n.id), [model.nodes]);
  const layout = useForceLayout(nodeIds, model.edges);

  const [hovered, setHovered] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);

  // Map a pointer event into the SVG's own coordinate space (handles scaling
  // and letterboxing correctly, unlike a manual ratio).
  const toLocal = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  };

  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { id, moved: false };
    layout.setFixed(id, true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toLocal(e);
    if (!p) return;
    drag.moved = true;
    layout.setPosition(drag.id, p.x, p.y);
  };
  const onPointerUp = (id: string) => (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    layout.setFixed(id, false);
    layout.reheat();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    // A press that didn't move is a click → open the resource.
    if (drag && !drag.moved) {
      const node = model.nodes.find((n) => n.id === id);
      if (node) navigate(`/explore/${node.resourceType}/${node.resourceId}`);
    }
  };

  const neighbors = hovered ? adjacency.get(hovered) : undefined;
  const isLit = (id: string) => !hovered || id === hovered || !!neighbors?.has(id);

  if (model.nodes.length === 0) return null;

  const types = [...new Set(model.nodes.map((n) => n.resourceType))];

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-5 py-3">
        <p className="label-mono">constellation</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ink-3">
          {types.slice(0, 6).map((t) => (
            <span key={t} className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color(t) }} />
              {t}
            </span>
          ))}
          <span>· hollow = referenced, not fetched</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="h-[460px] w-full touch-none select-none"
        onPointerMove={onPointerMove}
        role="img"
        aria-label={`Graph of ${model.nodes.length} resources and ${model.edges.length} references`}
      >
        {/* Edges */}
        {model.edges.map((e, i) => {
          const a = layout.nodes.get(e.source);
          const b = layout.nodes.get(e.target);
          if (!a || !b) return null;
          const lit = !hovered || e.source === hovered || e.target === hovered;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--color-rule)"
              strokeWidth={lit ? 1.5 : 1}
              opacity={lit ? 1 : 0.25}
            />
          );
        })}

        {/* Nodes */}
        {model.nodes.map((n) => {
          const p = layout.nodes.get(n.id);
          if (!p) return null;
          const lit = isLit(n.id);
          const c = color(n.resourceType);
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              opacity={lit ? 1 : 0.3}
              className="cursor-pointer"
              onPointerDown={onPointerDown(n.id)}
              onPointerUp={onPointerUp(n.id)}
              onPointerEnter={() => setHovered(n.id)}
              onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
            >
              <circle
                r={n.present ? 6 : 5}
                fill={n.present ? c : 'var(--color-paper)'}
                stroke={c}
                strokeWidth={n.present ? 0 : 1.5}
              />
              {(hovered === n.id || !n.present) && (
                <text
                  y={-11}
                  textAnchor="middle"
                  className="pointer-events-none fill-[var(--color-ink)]"
                  style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
                >
                  {n.resourceType}
                  {hovered === n.id ? ` · ${n.label}`.slice(0, 40) : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
