/**
 * Fetch the recent history of one Observation code for one subject, so a single
 * reading can be shown in the context of its own trend.
 *
 * This is an extra request per resource, so it is only used on the detail view
 * (never in a results grid). Failures are silent — the sparkline just doesn't
 * render if the server can't satisfy the query.
 */

import { useQuery } from '@tanstack/react-query';
import { fhirClient } from '../fhir/client';
import type { Bundle, Observation } from '../fhir/types';

export interface SeriesPoint {
  date: string;
  value: number;
}

/** Build a search token for a coding: `system|code`, or bare code. */
function codeToken(observation: Observation): string | undefined {
  const coding = observation.code?.coding?.find((c) => c.code);
  if (!coding?.code) return undefined;
  return coding.system ? `${coding.system}|${coding.code}` : coding.code;
}

function pointFrom(o: Observation): SeriesPoint | undefined {
  const value = o.valueQuantity?.value;
  const date = o.effectiveDateTime ?? o.effectivePeriod?.start ?? o.meta?.lastUpdated;
  if (typeof value !== 'number' || !Number.isFinite(value) || !date) return undefined;
  return { date, value };
}

export function useObservationSeries(
  baseUrl: string,
  observation: Observation | undefined,
  token = '',
) {
  const subject = observation?.subject?.reference;
  const code = observation ? codeToken(observation) : undefined;
  const enabled = !!baseUrl && !!subject && !!code;

  return useQuery<SeriesPoint[]>({
    queryKey: ['obs-series', baseUrl, subject, code, token],
    queryFn: async () => {
      const bundle: Bundle<Observation> = await fhirClient.search<Observation>(
        baseUrl,
        'Observation',
        { subject: subject!, code: code!, _sort: '-date', _count: '24' },
        token || undefined,
      );
      const points = (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is Observation => !!r)
        .map(pointFrom)
        .filter((p): p is SeriesPoint => !!p);
      // The server returns newest-first; charts read left-to-right in time.
      return points.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled,
    retry: false,
    staleTime: 60 * 1000,
  });
}
