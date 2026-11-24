import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef } from "react";
import { z } from "zod";

import { listCurrentUserPiecesInfiniteOptions } from "@/api/generated/@tanstack/react-query.gen";
import {
  AddTile,
  Box,
  EmptyState,
  ErrorState,
  FilterMenu,
  LoadMoreSentinel,
  Skeleton,
  Text,
  TextLink,
} from "@/design-system";
import { type CatalogTabFilter, catalogTabs } from "@/features/pieces/birdie-and-claire-catalog";
import { OwnedPieceCard } from "@/features/pieces/owned-piece-card";
import { usePagination } from "@/lib/use-pagination";

export const Route = createFileRoute("/_signedIn/_onboarded/_nav/profile/pieces")({
  validateSearch: z.object({
    // Caught, so a category no tab has shows every piece. That includes ?category=123, which the
    // router reads as a number.
    category: z
      .enum(catalogTabs.map((tab) => tab.value))
      .optional()
      .catch(undefined),
  }),
  component: PiecesPage,
});

function PiecesPage() {
  const { category } = Route.useSearch();
  const navigate = useNavigate();
  const categoryTab = catalogTabs.find((tab) => tab.value === category);

  return (
    <>
      <Box className="mb-lg flex items-center justify-between gap-md">
        <Text variant="heading">Pieces I Own</Text>
        <FilterMenu
          label="Filter"
          options={catalogTabs}
          value={category ?? null}
          onValueChange={(nextCategory) =>
            void navigate({
              to: "/profile/pieces",
              search: nextCategory === null ? {} : { category: nextCategory },
            })
          }
        />
      </Box>
      <OwnedPieces filter={categoryTab?.filter} />
    </>
  );
}

function OwnedPieces({ filter }: { filter: CatalogTabFilter | undefined }) {
  const navigate = useNavigate();
  const listRef = useRef<HTMLUListElement>(null);

  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = usePagination(listCurrentUserPiecesInfiniteOptions({ query: { limit: 20, ...filter } }));

  const loadMore = useCallback(() => {
    // The observer re-fires on rebuild, so fetching while errored would retry in a loop.
    if (!isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  // The pressed Remove button leaves with its card, so focus would fall back to the page.
  function focusList() {
    listRef.current?.focus();
  }

  if (isPending) {
    return (
      <Box
        role="status"
        aria-label="Loading your pieces"
        className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-4"
      >
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="aspect-portrait" />
        ))}
      </Box>
    );
  }

  if (!data) {
    return <ErrorState message="Couldn't load your pieces." onRetry={() => void refetch()} />;
  }

  const pieces = data.pages.flatMap((page) => page.items);

  // A filter that matches nothing gets this too, as Saved outfits does with its usual empty state.
  if (pieces.length === 0) {
    return (
      <Box className="flex flex-col items-center gap-sm">
        <EmptyState title="No pieces yet" />
        <TextLink to="/pieces/add">Add Items</TextLink>
      </Box>
    );
  }

  return (
    <>
      <ul
        ref={listRef}
        tabIndex={-1}
        aria-label="Pieces I own"
        className="flex flex-wrap items-start gap-md focus-ring"
      >
        {pieces.map((piece) => (
          <OwnedPieceCard key={piece.id} piece={piece} onRemoved={focusList} />
        ))}
        {/* Saved outfits hides its add tile while filtered too. */}
        {filter === undefined && (
          <li>
            <AddTile
              label="Add another piece"
              onClick={() => void navigate({ to: "/pieces/add" })}
            />
          </li>
        )}
        {hasNextPage && <LoadMoreSentinel as="li" onVisible={loadMore} />}
      </ul>
      {isFetchNextPageError && (
        <ErrorState
          message="Couldn't load more pieces."
          onRetry={() => void fetchNextPage()}
          retryLabel="Retry"
        />
      )}
    </>
  );
}
