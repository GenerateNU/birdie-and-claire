import { useCallback, useEffect, useRef, useState } from "react";

/** The wrapper every paginated list endpoint returns, in wire field names. */
export type Page<T> = {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
};

export type Pagination<T> = {
  items: T[];
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  loadMore: () => void;
};

type State<T> = {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
};

function loadingState<T>(): State<T> {
  return { items: [], cursor: null, hasMore: false, isLoading: true, error: null };
}

/**
 * Drives any endpoint returning the Page wrapper; knows nothing about the resource.
 * Pages accumulate, and changing the path or filters starts over.
 */
export function usePagination<T>(
  path: string,
  filters: Record<string, string>,
  limit = 20,
): Pagination<T> {
  // Values decide the reset, not object identity; sorting makes key order irrelevant.
  const filterKey = new URLSearchParams(
    Object.entries(filters).sort(([left], [right]) => left.localeCompare(right)),
  ).toString();

  const [state, setState] = useState<State<T>>(loadingState<T>);

  // A response from a stale generation belongs to filters already moved off; drop it.
  const generation = useRef(0);
  const inFlight = useRef(false);
  const abort = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | null, requestGeneration: number) => {
      const query = new URLSearchParams(filterKey);

      query.set("limit", String(limit));

      if (cursor !== null) {
        query.set("cursor", cursor);
      }

      const controller = new AbortController();

      abort.current = controller;
      inFlight.current = true;
      setState((previous) => ({ ...previous, isLoading: true, error: null }));

      try {
        const response = await fetch(`${path}?${query.toString()}`, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }

        const page: Page<T> = await response.json();

        if (requestGeneration !== generation.current) {
          return;
        }

        setState((previous) => ({
          items: [...previous.items, ...page.items],
          cursor: page.next_cursor,
          hasMore: page.has_more,
          isLoading: false,
          error: null,
        }));
      } catch (cause) {
        if (requestGeneration !== generation.current || controller.signal.aborted) {
          return;
        }

        setState((previous) => ({
          ...previous,
          isLoading: false,
          error: cause instanceof Error ? cause.message : "request failed",
        }));
      } finally {
        if (requestGeneration === generation.current) {
          inFlight.current = false;
        }
      }
    },
    [path, filterKey, limit],
  );

  useEffect(() => {
    generation.current += 1;
    abort.current?.abort();
    inFlight.current = false;
    setState(loadingState<T>());

    void fetchPage(null, generation.current);

    return () => {
      abort.current?.abort();
    };
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    // The ref, not state: a setState from the first click has not landed yet.
    if (inFlight.current || !state.hasMore || state.cursor === null) {
      return;
    }

    void fetchPage(state.cursor, generation.current);
  }, [fetchPage, state.hasMore, state.cursor]);

  return {
    items: state.items,
    hasMore: state.hasMore,
    isLoading: state.isLoading,
    error: state.error,
    loadMore,
  };
}
