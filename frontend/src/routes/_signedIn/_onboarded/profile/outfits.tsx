import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import { listOutfitsInfiniteOptions } from "@/api/generated/@tanstack/react-query.gen";
import { EmptyState, ErrorState, Spinner, Text } from "@/design-system";
import { OutfitList } from "@/features/outfits/outfit-list";
import { usePagination } from "@/lib/use-pagination";

export const Route = createFileRoute("/_signedIn/_onboarded/profile/outfits")({
  component: OutfitsPage,
});

function OutfitsPage() {
  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = usePagination(listOutfitsInfiniteOptions({ query: { limit: 20 } }));

  // The cursor is unused because the infinite query already tracks the next page param.
  const onLoadMore = useCallback(() => {
    // The observer re-fires on rebuild, so fetching while errored would retry in a loop.
    if (!isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  if (isPending) {
    return <Spinner />;
  }

  if (!data) {
    return <ErrorState message="Couldn't load your outfits." onRetry={() => void refetch()} />;
  }

  const outfits = data.pages.flatMap((page) => page.items);
  const lastPage = data.pages[data.pages.length - 1];
  const nextCursor = hasNextPage ? lastPage.next_cursor : null;

  return (
    <>
      <Text variant="heading" className="mb-xs">
        Saved Outfits
      </Text>
      {/* No count: GET /outfits doesn't return a total. */}
      <Text variant="subheading" className="mb-lg">
        All
      </Text>
      {outfits.length === 0 ? (
        <EmptyState title="No outfits yet" />
      ) : (
        <OutfitList outfits={outfits} nextCursor={nextCursor} onLoadMore={onLoadMore} />
      )}
      {isFetchNextPageError && (
        <ErrorState
          message="Couldn't load more outfits."
          onRetry={() => void fetchNextPage()}
          retryLabel="Retry"
        />
      )}
    </>
  );
}
