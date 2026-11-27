import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef } from "react";

import { listCurrentUserPiecesInfiniteOptions } from "@/api/generated/@tanstack/react-query.gen";
import {
  AddTile,
  Box,
  EmptyState,
  ErrorState,
  LoadMoreSentinel,
  Skeleton,
  Text,
  TextLink,
} from "@/design-system";
import { OwnedPieceCard } from "@/features/pieces/owned-piece-card";
import { usePagination } from "@/lib/use-pagination";

export const Route = createFileRoute("/_signedIn/_onboarded/_nav/profile/pieces")({
  component: PiecesPage,
});

function PiecesPage() {
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
  } = usePagination(listCurrentUserPiecesInfiniteOptions({ query: { limit: 20 } }));

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
      <>
        <Text variant="heading" className="mb-lg">
          Pieces I Own
        </Text>
        <Box
          role="status"
          aria-label="Loading your pieces"
          className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-4"
        >
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="aspect-portrait" />
          ))}
        </Box>
      </>
    );
  }

  if (!data) {
    return <ErrorState message="Couldn't load your pieces." onRetry={() => void refetch()} />;
  }

  const pieces = data.pages.flatMap((page) => page.items);

  if (pieces.length === 0) {
    return (
      <>
        <Text variant="heading" className="mb-lg">
          Pieces I Own
        </Text>
        <Box className="flex flex-col items-center gap-sm">
          <EmptyState title="No pieces yet" />
          <TextLink to="/pieces/add">Add Items</TextLink>
        </Box>
      </>
    );
  }

  return (
    <>
      <Text variant="heading" className="mb-lg">
        Pieces I Own
      </Text>
      <ul
        ref={listRef}
        tabIndex={-1}
        aria-label="Pieces I own"
        className="flex flex-wrap items-start gap-md focus-ring"
      >
        {pieces.map((piece) => (
          <OwnedPieceCard key={piece.id} piece={piece} onRemoved={focusList} />
        ))}
        <li>
          <AddTile label="Add another piece" onClick={() => void navigate({ to: "/pieces/add" })} />
        </li>
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
