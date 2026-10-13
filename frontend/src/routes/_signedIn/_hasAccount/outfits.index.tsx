import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import OutfitList, { type Outfit } from "@/OutfitList";
import { Button } from "@/design-system";
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
  } = usePagination<Outfit>("/api/v1/outfits");

  // The cursor is unused because usePagination already tracks the next page param.
  const onLoadMore = useCallback(() => {
    // The observer re-fires on rebuild, so fetching while errored would retry in a loop.
    if (!isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  if (isPending) {
    return <div className="min-h-screen bg-gray-950 text-white p-8">Loading…</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        Failed to load outfits: {error?.message}
      </div>
    );
  }

  const outfits = data.pages.flatMap((page) => page.items);
  const lastPage = data.pages[data.pages.length - 1];
  const nextCursor = hasNextPage ? lastPage.next_cursor : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-xl font-bold mb-2">Outfits</h1>
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
