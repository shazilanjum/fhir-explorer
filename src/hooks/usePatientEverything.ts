/**
 * Assemble a patient's whole record.
 *
 * Prefer `Patient/{id}/$everything` — one call, the server decides what's
 * relevant. When that isn't supported (many servers don't implement it), fall
 * back to fanning out `patient=` searches across the common clinical types and
 * label which method answered, so the UI can be honest about completeness.
 */

import { useQuery } from '@tanstack/react-query';
import { fhirClient } from '../fhir/client';
import type { AnyResource, Bundle } from '../fhir/types';

const LINKED_TYPES = [
  'Encounter',
  'Observation',
  'Condition',
  'MedicationRequest',
  'MedicationStatement',
  'Procedure',
  'DiagnosticReport',
  'AllergyIntolerance',
  'Immunization',
];

export type EverythingMethod = 'everything' | 'patient-search';

export interface PatientRecord {
  patient?: AnyResource;
  /** Every non-Patient resource, grouped by resourceType. */
  byType: Record<string, AnyResource[]>;
  total: number;
  method: EverythingMethod;
}

function collect(bundle: Bundle<AnyResource>, record: PatientRecord, patientId: string) {
  for (const entry of bundle.entry ?? []) {
    const r = entry.resource;
    if (!r?.resourceType) continue;
    if (r.resourceType === 'Patient') {
      if (!record.patient || r.id === patientId) record.patient = r;
      continue;
    }
    (record.byType[r.resourceType] ??= []).push(r);
    record.total += 1;
  }
}

export function usePatientEverything(baseUrl: string, id: string, token = '') {
  return useQuery<PatientRecord>({
    queryKey: ['everything', baseUrl, id, token],
    queryFn: async () => {
      const auth = token || undefined;
      const record: PatientRecord = { byType: {}, total: 0, method: 'everything' };

      // Strategy 1 — $everything.
      try {
        const bundle = await fhirClient.everything<AnyResource>(baseUrl, id, auth);
        collect(bundle, record, id);
        if (record.total > 0 || record.patient) return record;
      } catch {
        // Not supported — fall through.
      }

      // Strategy 2 — read the Patient, then fan out per-type searches.
      record.method = 'patient-search';
      record.byType = {};
      record.total = 0;
      try {
        record.patient = await fhirClient.read<AnyResource>(baseUrl, 'Patient', id, auth);
      } catch {
        // Leave patient undefined; the linked resources still tell a story.
      }

      const settled = await Promise.allSettled(
        LINKED_TYPES.map((type) =>
          fhirClient.search<AnyResource>(
            baseUrl,
            type,
            { patient: `Patient/${id}`, _count: '50' },
            auth,
          ),
        ),
      );
      for (const result of settled) {
        if (result.status === 'fulfilled') collect(result.value, record, id);
      }
      return record;
    },
    enabled: !!baseUrl && !!id,
    retry: false,
    staleTime: 60 * 1000,
  });
}
