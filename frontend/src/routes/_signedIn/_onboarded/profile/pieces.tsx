import { Plus } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

import { listCurrentUserPiecesInfiniteOptions } from "@/api/generated/@tanstack/react-query.gen";
import {
  Box,
  Button,
  EmptyState,
  ErrorState,
  Link,
  Skeleton,
  Text,
  TextLink,
} from "@/design-system";
import { LoadMoreSentinel } from "@/features/pieces/load-more-sentinel";
import { OwnedPieceCard } from "@/features/pieces/owned-piece-card";
import { usePagination } from "@/lib/use-pagination";

export const Route = createFileRoute("/_signedIn/_onboarded/profile/pieces")({
  component: PiecesPage,
});

function PiecesPage() {
  const [editing, setEditing] = useState(false);
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
          <TextLink to="/pieces/add" leadingIcon={Plus}>
            Add Items
          </TextLink>
        </Box>
      </>
    );
  }

  return (
    <>
      <Box className="mb-lg flex items-center justify-between gap-md">
        <Text variant="heading">Pieces I Own</Text>
        <Button
          label={editing ? "Done" : "Edit"}
          variant="secondary"
          size="sm"
          onClick={() => setEditing(!editing)}
        />
      </Box>
      <ul
        ref={listRef}
        tabIndex={-1}
        aria-label="Pieces I own"
        className="grid grid-cols-2 gap-md focus-ring md:grid-cols-3 lg:grid-cols-4"
      >
        {pieces.map((piece) => (
          <OwnedPieceCard key={piece.id} piece={piece} showRemove={editing} onRemoved={focusList} />
        ))}
        <li>
          <Link
            to="/pieces/add"
            className="flex aspect-portrait flex-col items-center justify-center gap-xs bg-placeholder text-body"
          >
            <Plus aria-hidden="true" />
            Add Another Piece
          </Link>
        </li>
        {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
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
