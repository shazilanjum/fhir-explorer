/**
 * Turn a set of resources (a search result, or a patient's record) into a graph
 * the constellation view can lay out.
 *
 * - Every resource in the set is a node.
 * - Every `Reference` inside a resource is an edge to its target.
 * - A target that isn't in the set becomes a "ghost" node (referenced but not
 *   fetched) — this is what makes shared hubs appear: twenty Observations that
 *   all reference one Patient collapse onto a single ghost Patient node, and
 *   the shared structure becomes visible.
 */

import { extractReferences } from './references';
import { summarizeResource } from './display';
import type { AnyResource } from './types';

export interface GraphNode {
  /** `Type/id`. */
  id: string;
  resourceType: string;
  resourceId: string;
  label: string;
  /** True when the resource is in the set; false for referenced-only targets. */
  present: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraphModel(resources: AnyResource[]): GraphModel {
  const nodes = new Map<string, GraphNode>();
  const edgeKeys = new Set<string>();
  const edges: GraphEdge[] = [];

  // First pass: every fetched resource is a present node.
  for (const r of resources) {
    if (!r.id) continue;
    const id = `${r.resourceType}/${r.id}`;
    nodes.set(id, {
      id,
      resourceType: r.resourceType,
      resourceId: r.id,
      label: summarizeResource(r).title,
      present: true,
    });
  }

  // Second pass: edges to referenced targets (adding ghost nodes as needed).
  for (const r of resources) {
    if (!r.id) continue;
    const source = `${r.resourceType}/${r.id}`;
    for (const ref of extractReferences(r, '')) {
      if (!ref.resourceType || !ref.id) continue;
      const target = `${ref.resourceType}/${ref.id}`;
      if (target === source) continue;
      if (!nodes.has(target)) {
        nodes.set(target, {
          id: target,
          resourceType: ref.resourceType,
          resourceId: ref.id,
          label: ref.display ?? ref.id,
          present: false,
        });
      }
      const key = `${source}→${target}`;
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        edges.push({ source, target });
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}

/** Adjacency for hover highlighting: node id → set of connected node ids. */
export function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b);
  };
  for (const e of edges) {
    link(e.source, e.target);
    link(e.target, e.source);
  }
  return adj;
}
