/**
 * Find resources that point *at* a given resource — the inbound half of the
 * reference graph.
 *
 * There is no single portable way to ask "what references this?", so we try two
 * strategies and report which one produced the answer:
 *
 *   1. `_revinclude=*` — the general form. Elegant when supported, but many
 *      servers (including the public HAPI test server) return only the match.
 *   2. Reverse search by `patient=` across common clinical types — narrower
 *      (only works when the target is a Patient) but widely supported.
 *
 * Opt-in, because it costs extra round trips.
 */

import { useQuery } from '@tanstack/react-query';
import { fhirClient } from '../fhir/client';
import type { AnyResource, Bundle } from '../fhir/types';

export interface IncomingReference {
  resourceType: string;
  id: string;
}

export type IncomingMethod = 'revinclude' | 'patient-search' | 'none';

export interface IncomingResult {
  items: IncomingReference[];
  method: IncomingMethod;
  /** True when no strategy could give a trustworthy answer. */
  inconclusive: boolean;
}

/** Types that commonly reference a Patient, searchable via `patient=`. */
const PATIENT_LINKED_TYPES = [
  'Observation',
  'Encounter',
  'Condition',
  'MedicationRequest',
  'Procedure',
  'DiagnosticReport',
  'AllergyIntolerance',
  'Immunization',
];

const PER_TYPE = 4;

function collect(bundle: Bundle<AnyResource>, skip?: { resourceType: string; id: string }) {
  const out: IncomingReference[] = [];
  for (const entry of bundle.entry ?? []) {
    const r = entry.resource;
    if (!r?.resourceType || !r.id) continue;
    if (skip && r.resourceType === skip.resourceType && r.id === skip.id) continue;
    out.push({ resourceType: r.resourceType, id: r.id });
  }
  return out;
}

export function useIncomingReferences(
  baseUrl: string,
  resourceType: string,
  id: string,
  token = '',
  enabled = false,
) {
  return useQuery<IncomingResult>({
    queryKey: ['incoming-refs', baseUrl, resourceType, id, token],
    queryFn: async () => {
      const auth = token || undefined;

      // Strategy 1 — the portable-in-theory one.
      try {
        const bundle = await fhirClient.search<AnyResource>(
          baseUrl,
          resourceType,
          { _id: id, _revinclude: '*', _count: '50' },
          auth,
        );
        const items = collect(bundle, { resourceType, id });
        if (items.length) return { items, method: 'revinclude', inconclusive: false };
      } catch {
        // Server rejected _revinclude — fall through.
      }

      // Strategy 2 — reverse search, only meaningful for a Patient hub.
      if (resourceType === 'Patient') {
        const settled = await Promise.allSettled(
          PATIENT_LINKED_TYPES.map((type) =>
            fhirClient.search<AnyResource>(
              baseUrl,
              type,
              { patient: `Patient/${id}`, _count: String(PER_TYPE) },
              auth,
            ),
          ),
        );
        const items: IncomingReference[] = [];
        for (const result of settled) {
          if (result.status === 'fulfilled') items.push(...collect(result.value));
        }
        // Dedupe by type/id.
        const seen = new Set<string>();
        const unique = items.filter((i) => {
          const key = `${i.resourceType}/${i.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (unique.length) {
          return { items: unique, method: 'patient-search', inconclusive: false };
        }
      }

      return { items: [], method: 'none', inconclusive: true };
    },
    enabled: enabled && !!baseUrl && !!resourceType && !!id,
    retry: false,
    staleTime: 60 * 1000,
  });
}
