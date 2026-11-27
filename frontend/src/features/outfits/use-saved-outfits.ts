import { useCallback } from "react";

import { listOutfitsInfiniteOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { OutfitResponse } from "@/api/generated/types.gen";
import {
  isCollectionNotFound,
  retryUnlessCollectionNotFound,
} from "@/features/collections/collection-query";
import { canFetchNextPage } from "@/features/outfits/saved-outfits";
import { usePagination } from "@/lib/use-pagination";

// 12 fills whole rows at 2, 3, 4 and 6 columns. Each outfit costs one garment cut-out per product,
// so pages stay small.
const PAGE_SIZE = 12;

type SavedOutfitsLoaded = {
  status: "loaded";
  outfits: OutfitResponse[];
  hasMore: boolean;
  loadMore: () => void;
  /** The message for a failed request for another page, or null. */
  loadMoreError: string | null;
  retryLoadMore: () => void;
};

type SavedOutfitsFlow =
  | { status: "loading" }
  | {
      status: "error";
      message: string;
      retry: () => void;
      /** The filter names a collection that is missing or someone else's. */
      collectionNotFound: boolean;
    }
  | SavedOutfitsLoaded;

/** The user's outfits, newest first, or only those in `collectionId`'s collection. */
export function useSavedOutfits(collectionId?: string): SavedOutfitsFlow {
  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = usePagination({
    ...listOutfitsInfiniteOptions({ query: { limit: PAGE_SIZE, collection_id: collectionId } }),
    retry: retryUnlessCollectionNotFound,
  });

  const loadMore = useCallback(() => {
    if (canFetchNextPage({ isFetchingNextPage, isFetchNextPageError })) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  if (isPending) {
    return { status: "loading" };
  }

  // Before the data check: a refetch that finds the collection gone keeps the old pages in data.
  if (collectionId !== undefined && isCollectionNotFound(error)) {
    return {
      status: "error",
      message: "Couldn't load your outfits.",
      retry: () => void refetch(),
      collectionNotFound: true,
    };
  }

  if (!data) {
    return {
      status: "error",
      message: "Couldn't load your outfits.",
      retry: () => void refetch(),
      collectionNotFound: false,
    };
  }

  return {
    status: "loaded",
    outfits: data.pages.flatMap((page) => page.items),
    hasMore: hasNextPage,
    loadMore,
    loadMoreError: isFetchNextPageError ? "Couldn't load more outfits." : null,
    retryLoadMore: () => void fetchNextPage(),
  };
}
