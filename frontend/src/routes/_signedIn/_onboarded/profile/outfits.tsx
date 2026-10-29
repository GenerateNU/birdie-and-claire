import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import OutfitList, { type Outfit } from "@/OutfitList";
import { Empty, ErrorState, Spinner, Text } from "@/design-system";
import { usePagination } from "@/utils/usePagination";

export const Route = createFileRoute("/_signedIn/_onboarded/profile/outfits")({
  component: OutfitsPage,
});

function OutfitsPage() {
  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = usePagination<Outfit>("/api/v1/outfits");

  // The cursor is unused because usePagination already tracks the next page param.
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
    return (
      <ErrorState
        message={`Failed to load outfits: ${error?.message}`}
        onRetry={() => void refetch()}
      />
    );
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
        <Empty title="No outfits yet" />
      ) : (
        <OutfitList outfits={outfits} nextCursor={nextCursor} onLoadMore={onLoadMore} />
      )}
      {isFetchNextPageError && (
        <ErrorState
          message={`Failed to load more: ${error?.message}`}
          onRetry={() => void fetchNextPage()}
          retryLabel="Retry"
        />
      )}
    </>
  );
}
