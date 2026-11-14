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

/**
 * Runs a generated `*InfiniteOptions` for a cursor-paginated endpoint, starting
 * at the first page and following `next_cursor` while `has_more` is set.
 */
export function usePagination<
  TPage extends CursorPage,
  TError,
  TKey extends QueryKey,
  TPageParam extends string | object,
>(
  options: Omit<
    UseInfiniteQueryOptions<TPage, TError, InfiniteData<TPage>, TKey, TPageParam>,
    "initialPageParam" | "getNextPageParam"
  >,
) {
  return useInfiniteQuery({
    ...options,
    // SAFETY: the generated queryFn merges an object page param into the key's own params, so an
    // empty one adds no cursor and the first request gets the first page. Its type is the key's
    // params, which demands the endpoint's required query fields even though the key has them.
    initialPageParam: {} as TPageParam,
    // Avoid refetching a page just from paging forward and back.
    staleTime: 60_000,
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more || lastPage.next_cursor === null) {
        return undefined;
      }

      // SAFETY: every generated page param type takes a string, which the queryFn sends as the
      // cursor.
      return lastPage.next_cursor as TPageParam;
    },
  });
}
