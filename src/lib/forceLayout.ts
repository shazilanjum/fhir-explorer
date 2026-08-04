/**
 * A tiny force-directed layout, hand-rolled to avoid pulling in d3-force.
 *
 * Result sets here are small (≤ ~50 nodes), so a naïve O(n²) repulsion each
 * tick is fine. Three forces: Coulomb-style repulsion between every pair,
 * Hooke spring along each edge toward a rest length, and a gentle pull toward
 * centre. Alpha decays so the system settles; dragging a node reheats it.
 *
 * Runs on requestAnimationFrame and reports positions through a version
 * counter, so React re-renders on each tick without allocating new maps.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** When true the simulation won't move it (being dragged / pinned). */
  fixed: boolean;
}

interface Edge {
  source: string;
  target: string;
}

const WIDTH = 800;
const HEIGHT = 460;
const REPULSION = 5200;
const SPRING = 0.02;
const REST_LENGTH = 90;
const CENTER_PULL = 0.008;
const DAMPING = 0.86;
const ALPHA_DECAY = 0.985;
const MIN_ALPHA = 0.02;

export interface ForceLayout {
  width: number;
  height: number;
  nodes: Map<string, SimNode>;
  /** Bumps every tick so consumers re-render. */
  version: number;
  reheat: () => void;
  setFixed: (id: string, fixed: boolean) => void;
  setPosition: (id: string, x: number, y: number) => void;
}

export function useForceLayout(nodeIds: string[], edges: Edge[]): ForceLayout {
  // Stable key so the sim only rebuilds when the graph's shape changes.
  const idKey = nodeIds.join('|');
  const edgeKey = edges.map((e) => `${e.source}>${e.target}`).join('|');

  const nodesRef = useRef<Map<string, SimNode>>(new Map());
  const alphaRef = useRef(1);
  const [version, setVersion] = useState(0);

  const edgeList = useMemo(() => edges, [edgeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // (Re)initialise nodes on a deterministic ring when the graph changes.
  useMemo(() => {
    const next = new Map<string, SimNode>();
    const n = nodeIds.length || 1;
    nodeIds.forEach((id, i) => {
      const prev = nodesRef.current.get(id);
      if (prev) {
        next.set(id, prev); // keep position across incremental changes
        return;
      }
      const angle = (i / n) * Math.PI * 2;
      const radius = 120 + (i % 5) * 18;
      next.set(id, {
        id,
        x: WIDTH / 2 + Math.cos(angle) * radius,
        y: HEIGHT / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fixed: false,
      });
    });
    nodesRef.current = next;
    alphaRef.current = 1;
  }, [idKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const nodes = nodesRef.current;
      const arr = [...nodes.values()];
      const alpha = alphaRef.current;

      if (alpha > MIN_ALPHA) {
        // Pairwise repulsion.
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const a = arr[i];
            const b = arr[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let dist2 = dx * dx + dy * dy;
            if (dist2 < 1) dist2 = 1;
            const force = (REPULSION / dist2) * alpha;
            const dist = Math.sqrt(dist2);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
          }
        }
        // Spring along edges.
        for (const e of edgeList) {
          const a = nodes.get(e.source);
          const b = nodes.get(e.target);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - REST_LENGTH) * SPRING * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
        // Centre pull + integrate.
        for (const node of arr) {
          if (node.fixed) {
            node.vx = 0;
            node.vy = 0;
            continue;
          }
          node.vx += (WIDTH / 2 - node.x) * CENTER_PULL * alpha;
          node.vy += (HEIGHT / 2 - node.y) * CENTER_PULL * alpha;
          node.vx *= DAMPING;
          node.vy *= DAMPING;
          node.x += node.vx;
          node.y += node.vy;
          node.x = Math.max(24, Math.min(WIDTH - 24, node.x));
          node.y = Math.max(24, Math.min(HEIGHT - 24, node.y));
        }
        alphaRef.current *= ALPHA_DECAY;
        setVersion((v) => v + 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idKey, edgeList]);

  const reheat = () => {
    alphaRef.current = Math.max(alphaRef.current, 0.6);
  };
  const setFixed = (id: string, fixed: boolean) => {
    const node = nodesRef.current.get(id);
    if (node) node.fixed = fixed;
  };
  const setPosition = (id: string, x: number, y: number) => {
    const node = nodesRef.current.get(id);
    if (node) {
      node.x = x;
      node.y = y;
      node.vx = 0;
      node.vy = 0;
    }
    setVersion((v) => v + 1);
  };

  return {
    width: WIDTH,
    height: HEIGHT,
    nodes: nodesRef.current,
    version,
    reheat,
    setFixed,
    setPosition,
  };
}
