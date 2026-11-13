import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";

type CursorPage = {
  has_more: boolean;
  next_cursor: string | null;
};

type PageParam = string | object;

/**
 * Runs a generated `*InfiniteOptions` for a cursor-paginated endpoint, starting
 * at the first page and following `next_cursor` while `has_more` is set.
 */
export function usePagination<TPage extends CursorPage, TError, TKey extends QueryKey>(
  options: Omit<
    UseInfiniteQueryOptions<TPage, TError, InfiniteData<TPage>, TKey, PageParam>,
    "initialPageParam" | "getNextPageParam"
  >,
) {
  return useInfiniteQuery({
    ...options,
    // An empty page param adds no cursor, so the first request gets the first page.
    initialPageParam: {},
    // Avoid refetching a page just from paging forward and back.
    staleTime: 60_000,
    getNextPageParam: (lastPage) =>
      lastPage.has_more && lastPage.next_cursor !== null ? lastPage.next_cursor : undefined,
  });
}
