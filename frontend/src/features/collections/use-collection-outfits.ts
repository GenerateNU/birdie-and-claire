import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { listCollectionOutfitsInfiniteOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { OutfitResponse } from "@/api/generated/types.gen";
import { canFetchNextPage } from "@/features/outfits/saved-outfits";

// Same page size as the saved outfits list, which renders the same cards.
const PAGE_SIZE = 12;

type CollectionOutfitsFlow =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | {
      status: "loaded";
      outfits: OutfitResponse[];
      hasMore: boolean;
      loadMore: () => void;
      loadMoreFailed: boolean;
      retryLoadMore: () => void;
    };

/** One collection's outfits, a page at a time. */
export function useCollectionOutfits(collectionId: string): CollectionOutfitsFlow {
  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = useInfiniteQuery({
    ...listCollectionOutfitsInfiniteOptions({
      path: { id: collectionId },
      query: { limit: PAGE_SIZE },
    }),
    // Not usePagination: its empty first page param doesn't type-check against an endpoint with a
    // required path param, so this one starts from the path instead.
    initialPageParam: { path: { id: collectionId } },
    staleTime: 60_000,
    getNextPageParam: (lastPage) =>
      lastPage.has_more && lastPage.next_cursor !== null ? lastPage.next_cursor : undefined,
  });

  const loadMore = useCallback(() => {
    if (canFetchNextPage({ isFetchingNextPage, isFetchNextPageError })) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  if (isPending) {
    return { status: "loading" };
  }

  if (!data) {
    return { status: "error", retry: () => void refetch() };
  }

  return {
    status: "loaded",
    outfits: data.pages.flatMap((page) => page.items),
    hasMore: hasNextPage,
    loadMore,
    loadMoreFailed: isFetchNextPageError,
    retryLoadMore: () => void fetchNextPage(),
  };
}
