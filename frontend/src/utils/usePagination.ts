import { useInfiniteQuery } from "@tanstack/react-query";

/** The wrapper every paginated list endpoint returns, in wire field names. */
export type Page<T> = {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
};

type Cursor = string | null;

const FIRST_PAGE: Cursor = null;

/**
 * Pages any endpoint returning the Page wrapper, on TanStack Query.
 * POST request: range and multi-select filters encode badly as query
 * params. Returns TanStack's own shape, so callers use data.pages directly.
 */
export function usePagination<TItem, TFilters>(path: string, filters: TFilters, limit = 20) {
  return useInfiniteQuery({
    // Hashed structurally, so a rebuilt filters object is not a change.
    queryKey: [path, filters, limit],
    initialPageParam: FIRST_PAGE,
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
    // null ends the list, which is what the wrapper already sends on the last page.
    getNextPageParam: (lastPage: Page<TItem>) => lastPage.next_cursor,
  });
}
