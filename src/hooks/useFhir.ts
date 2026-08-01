/**
 * React Query hooks wrapping the fhirClient. Keeping the query keys and
 * pagination logic here means components never touch fetch/caching directly.
 *
 * The bearer token is part of every query key, so changing it re-fetches.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fhirClient } from '../fhir/client';
import type { Bundle, CapabilityStatement, FhirResourceBase } from '../fhir/types';

/** Fetch and cache a server's CapabilityStatement. Disabled until a URL exists. */
export function useCapabilityStatement(baseUrl: string, token = '') {
  return useQuery<CapabilityStatement>({
    queryKey: ['capability', baseUrl, token],
    queryFn: () => fhirClient.getCapabilityStatement(baseUrl, token || undefined),
    enabled: !!baseUrl,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Pull the `next` link out of a Bundle, if present. */
function nextLink(bundle: Bundle): string | undefined {
  return bundle.link?.find((l) => l.relation === 'next')?.url;
}

/**
 * Paginated search. Each "page" is a Bundle; `fetchNextPage` follows the
 * server-provided `next` link so cursors/offsets stay opaque to us.
 */
export function useSearch<T extends FhirResourceBase = FhirResourceBase>(
  baseUrl: string,
  resourceType: string,
  params: Record<string, string>,
  enabled: boolean,
  token = '',
) {
  return useInfiniteQuery<Bundle<T>>({
    queryKey: ['search', baseUrl, resourceType, params, token],
    queryFn: ({ pageParam }) => {
      if (typeof pageParam === 'string') {
        return fhirClient.fetchBundleLink<T>(pageParam, token || undefined);
      }
      return fhirClient.search<T>(baseUrl, resourceType, params, token || undefined);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => nextLink(lastPage),
    enabled: enabled && !!baseUrl && !!resourceType,
    retry: false,
  });
}
