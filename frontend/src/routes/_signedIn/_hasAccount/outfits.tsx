import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import OutfitList, { type Outfit } from "@/OutfitList";
import { Button, Text } from "@/design-system";
import { usePagination } from "@/utils/usePagination";

export const Route = createFileRoute("/_signedIn/_hasAccount/outfits")({
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
  } = usePagination<Outfit>("/api/v1/outfits");

  // The cursor is unused because usePagination already tracks the next page param.
  const onLoadMore = useCallback(() => {
    // The observer re-fires on rebuild, so fetching while errored would retry in a loop.
    if (!isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  if (isPending) {
    return <div className="min-h-screen p-xl">Loading…</div>;
  }

  if (!data) {
    return <div className="min-h-screen p-xl">Failed to load outfits: {error?.message}</div>;
  }

  const outfits = data.pages.flatMap((page) => page.items);
  const lastPage = data.pages[data.pages.length - 1];
  const nextCursor = hasNextPage ? lastPage.next_cursor : null;

  return (
    <div className="min-h-screen p-xl">
      <Text variant="heading" className="mb-xs">
        Outfits
      </Text>
      <OutfitList outfits={outfits} nextCursor={nextCursor} onLoadMore={onLoadMore} />
      {isFetchNextPageError && (
        <p>
          Failed to load more: {error?.message}{" "}
          <Button label="Retry" onClick={() => void fetchNextPage()} />
        </p>
      )}
    </div>
  );
}
