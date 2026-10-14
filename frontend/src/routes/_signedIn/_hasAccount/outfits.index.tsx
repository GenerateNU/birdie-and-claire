import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import OutfitList, { type Outfit } from "@/OutfitList";
import { Empty, ErrorState, Spinner } from "@/design-system";
import { usePagination } from "@/utils/usePagination";

export const Route = createFileRoute("/_signedIn/_hasAccount/outfits/")({
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
    return (
      <div className="min-h-screen bg-background p-xl text-primary">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background p-xl text-primary">
        <ErrorState
          message={`Failed to load outfits: ${error?.message}`}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const outfits = data.pages.flatMap((page) => page.items);
  const lastPage = data.pages[data.pages.length - 1];
  const nextCursor = hasNextPage ? lastPage.next_cursor : null;

  return (
    <div className="min-h-screen bg-background p-xl text-primary">
      {/* Text's heading variant renders an h2, and the page needs an h1. */}
      <h1 className="mb-xs text-heading">Outfits</h1>
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
    </div>
  );
}
