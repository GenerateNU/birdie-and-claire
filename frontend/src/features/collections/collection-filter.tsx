import { useCallback } from "react";

import { listCollectionsInfiniteOptions } from "@/api/generated/@tanstack/react-query.gen";
import { ErrorState, FilterMenu } from "@/design-system";
import { canFetchNextPage } from "@/features/outfits/saved-outfits";
import { usePagination } from "@/lib/use-pagination";

type CollectionFilterProps = {
  /** The collection the list is filtered to, or undefined for all outfits. */
  collectionId: string | undefined;
  onCollectionIdChange: (collectionId: string | undefined) => void;
};

/** The Saved outfits Filter. It loads more collections as its list scrolls to the end. */
export function CollectionFilter({ collectionId, onCollectionIdChange }: CollectionFilterProps) {
  const {
    data,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = usePagination(listCollectionsInfiniteOptions());

  const loadMore = useCallback(() => {
    if (canFetchNextPage({ isFetchingNextPage, isFetchNextPageError })) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  // Checked with data, so a failed background refetch keeps the filter usable.
  if (data === undefined && isError) {
    return (
      <ErrorState
        message="Couldn't load your collections."
        onRetry={() => void refetch()}
        retryLabel="Retry"
      />
    );
  }

  const collections = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <FilterMenu
      label="Filter"
      options={collections.map((collection) => ({
        value: collection.id,
        label: `${collection.name} (${collection.outfit_count})`,
      }))}
      value={collectionId ?? null}
      onValueChange={(value) => onCollectionIdChange(value ?? undefined)}
      disabled={collections.length === 0}
      onLoadMore={hasNextPage ? loadMore : undefined}
      onRetryLoadMore={isFetchNextPageError ? () => void fetchNextPage() : undefined}
    />
  );
}
