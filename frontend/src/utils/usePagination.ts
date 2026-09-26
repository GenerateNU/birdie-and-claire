import { useInfiniteQuery } from "@tanstack/react-query";

/** The wrapper every paginated list endpoint returns, in wire field names. */
export type Page<T> = {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
};

type Cursor = string | null;

const FIRST_PAGE: Cursor = null;

// POST, not GET: range and multi-select filters encode badly as query params.
export function usePagination<TItem, TFilters>(path: string, filters: TFilters, limit = 20) {
  return useInfiniteQuery({
    // Hashed structurally, so a rebuilt filters object is not a change.
    queryKey: [path, filters, limit],
    initialPageParam: FIRST_PAGE,
    // Avoid refetching a page just from paging forward and back.
    staleTime: 60_000,
    queryFn: async ({ pageParam, signal }): Promise<Page<TItem>> => {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, cursor: pageParam, filters }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return await response.json();
    },
    // has_more is the explicit signal, a null cursor alone shouldn't decide it.
    getNextPageParam: (lastPage: Page<TItem>) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
  });
}
