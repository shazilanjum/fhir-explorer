/**
 * Fetch every version of a resource via `_history`, newest first. Opt-in (an
 * extra request), used only by the version scrubber on the detail view.
 */

import { useQuery } from '@tanstack/react-query';
import { fhirClient } from '../fhir/client';
import type { AnyResource } from '../fhir/types';

export interface ResourceVersion {
  versionId?: string;
  lastUpdated?: string;
  resource: AnyResource;
}

export function useResourceHistory(
  baseUrl: string,
  resourceType: string,
  id: string,
  token = '',
  enabled = false,
) {
  return useQuery<ResourceVersion[]>({
    queryKey: ['history', baseUrl, resourceType, id, token],
    queryFn: async () => {
      const bundle = await fhirClient.history<AnyResource>(baseUrl, resourceType, id, token);
      const versions = (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is AnyResource => !!r)
        .map((resource) => ({
          versionId: resource.meta?.versionId,
          lastUpdated: resource.meta?.lastUpdated,
          resource,
        }));
      // Present oldest → newest so a left-to-right scrubber reads as time.
      return versions.reverse();
    },
    enabled: enabled && !!baseUrl && !!resourceType && !!id,
    retry: false,
    staleTime: 60 * 1000,
  });
}
