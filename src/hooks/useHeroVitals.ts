/**
 * Fetches a small, fixed set of real vitals from the default HAPI server for
 * the landing page's hero — heart rate, a blood-pressure panel, and a body
 * weight. Real records, not invented numbers: each is the most recent match
 * for a known LOINC code.
 *
 * Independent per-card queries, so one failing (or a cold server) doesn't
 * blank the whole hero — the missing card just degrades to a skeleton state
 * rather than a fabricated value.
 */

import { useQuery } from '@tanstack/react-query';
import { fhirClient } from '../fhir/client';
import { deriveInstrument, type Instrument } from '../fhir/instruments';
import { summarizeResource } from '../fhir/display';
import { DEFAULT_BASE_URL } from '../context/ServerContext';
import type { Observation } from '../fhir/types';

export interface HeroVital {
  title: string;
  instrument: Instrument;
  resource: Observation;
}

const HEART_RATE_CODE = '8867-4';
const VITALS: { code: string; fallbackTitle: string }[] = [
  { code: HEART_RATE_CODE, fallbackTitle: 'Heart rate' },
  { code: '85354-9', fallbackTitle: 'Blood pressure panel' },
  { code: '29463-7', fallbackTitle: 'Body weight' },
];

function useOneVital(code: string, fallbackTitle: string) {
  return useQuery<HeroVital | null>({
    // Shared cache key: any consumer asking for the same code (the JSON-morph
    // section reuses the heart-rate example) gets the same fetch, not a
    // duplicate request.
    queryKey: ['hero-vital', code],
    queryFn: async () => {
      const bundle = await fhirClient.search<Observation>(DEFAULT_BASE_URL, 'Observation', {
        code: `http://loinc.org|${code}`,
        _count: '1',
      });
      const resource = bundle.entry?.[0]?.resource;
      if (!resource) return null;
      const instrument = deriveInstrument(resource);
      if (!instrument) return null;
      return { title: summarizeResource(resource).title || fallbackTitle, instrument, resource };
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/** Three independent queries — deliberately not one combined request. */
export function useHeroVitals() {
  const a = useOneVital(VITALS[0].code, VITALS[0].fallbackTitle);
  const b = useOneVital(VITALS[1].code, VITALS[1].fallbackTitle);
  const c = useOneVital(VITALS[2].code, VITALS[2].fallbackTitle);
  const queries = [a, b, c];
  return {
    vitals: queries.map((q) => q.data).filter((v): v is HeroVital => !!v),
    isLoading: queries.some((q) => q.isLoading),
    settled: queries.every((q) => !q.isLoading),
  };
}

/**
 * The same heart-rate record used in the hero, for sections that want to walk
 * through one real resource in detail (the JSON↔human morph, the dissection).
 */
export function useHeartRateExample() {
  return useOneVital(HEART_RATE_CODE, 'Heart rate');
}
