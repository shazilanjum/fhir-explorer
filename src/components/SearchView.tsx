/**
 * Search view for a single resource type (Workbench canvas). The committed
 * query lives in the URL (?param=value), so searches are shareable and
 * re-runnable from history. The form edits a draft and commits to the URL.
 */

import { useEffect, useMemo, useRef } from 'react';
import NumberFlow from '@number-flow/react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useServer } from '../context/ServerContext';
import { useSearch } from '../hooks/useFhir';
import type { AnyResource } from '../fhir/types';
import { SearchParamForm } from './SearchParamForm';
import { ResultCard } from './ResultCard';
import { DelayedSpinner, EmptyState, ErrorMessage, Skeleton } from './ui/primitives';

export function SearchView() {
  const { resourceType = '' } = useParams();
  const { baseUrl, token, addHistory } = useServer();
  const [searchParams, setSearchParams] = useSearchParams();

  const committed = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const committedKey = searchParams.toString();

  const query = useSearch<AnyResource>(baseUrl, resourceType, committed, true, token);

  // Record each distinct committed search into session history exactly once.
  const lastRecorded = useRef<string>('');
  useEffect(() => {
    const key = `${resourceType}?${committedKey}`;
    if (query.isSuccess && lastRecorded.current !== key) {
      lastRecorded.current = key;
      addHistory({ baseUrl, resourceType, params: committed });
    }
  }, [query.isSuccess, resourceType, committedKey, committed, baseUrl, addHistory]);

  const pages = query.data?.pages ?? [];
  const entries = pages.flatMap((p) => p.entry ?? []);
  const resources = entries.map((e) => e.resource).filter((r): r is AnyResource => !!r);
  const total = pages[0]?.total;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">{resourceType}</h1>
        {query.isSuccess && (
          <span className="inline-flex items-baseline gap-1 rounded-pill bg-accent-weak px-2.5 py-0.5 font-mono text-xs tabular-nums text-ink-2">
            <NumberFlow value={typeof total === 'number' ? total : resources.length} />
            <span className="text-ink-3">{typeof total === 'number' ? 'total' : 'loaded'}</span>
          </span>
        )}
      </div>

      <SearchParamForm
        key={`${resourceType}:${committedKey}`}
        resourceType={resourceType}
        initialParams={committed}
        isRunning={query.isFetching && !query.isFetchingNextPage}
        onSubmit={(params) => setSearchParams(params, { replace: false })}
      />

      {query.isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      )}

      {query.isError && <ErrorMessage error={query.error} />}

      {query.isSuccess && resources.length === 0 && (
        <EmptyState
          title="No results"
          description={`No ${resourceType} resources matched this search. Try loosening or removing parameters.`}
        />
      )}

      {resources.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {resources.map((resource, i) => (
              <ResultCard key={`${resource.id ?? 'x'}-${i}`} resource={resource} index={i} />
            ))}
          </div>

          <div className="flex items-center justify-center py-2">
            {query.hasNextPage ? (
              <button
                type="button"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="btn btn--soft !font-mono"
              >
                {query.isFetchingNextPage && <DelayedSpinner className="h-3.5 w-3.5" />}
                {query.isFetchingNextPage ? 'loading…' : 'load more'}
              </button>
            ) : (
              <p className="font-mono text-xs text-ink-3">
                all {resources.length} loaded {resourceType} shown
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
