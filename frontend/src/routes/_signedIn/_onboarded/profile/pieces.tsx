import { Plus } from "@phosphor-icons/react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import {
  listCurrentUserPiecesInfiniteOptions,
  listCurrentUserPiecesInfiniteQueryKey,
  listProductsInfiniteQueryKey,
  removeCurrentUserPieceMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import { Box, Button, Empty, ErrorState, Link, Spinner, Text } from "@/design-system";
import { LoadMoreSentinel } from "@/features/pieces/load-more-sentinel";
import { OwnedPieceCard } from "@/features/pieces/owned-piece-card";

export const Route = createFileRoute("/_signedIn/_onboarded/profile/pieces")({
  component: PiecesPage,
});

function PiecesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = useInfiniteQuery({
    ...listCurrentUserPiecesInfiniteOptions({ query: { limit: 20 } }),
    // An empty page param adds no cursor, so the first request gets the first page.
    initialPageParam: {},
    // has_more is the explicit signal, a null cursor alone shouldn't decide it.
    getNextPageParam: (lastPage) =>
      lastPage.has_more && lastPage.next_cursor !== null ? lastPage.next_cursor : undefined,
  });

  const removeMutation = useMutation({
    ...removeCurrentUserPieceMutation(),
    // The catalog leaves owned pieces out, so a removed piece goes back into the picker. Refreshed
    // on failure too: a 404 means the piece is already gone, and the list should stop showing it.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listCurrentUserPiecesInfiniteQueryKey() }),
        queryClient.invalidateQueries({ queryKey: listProductsInfiniteQueryKey() }),
      ]),
  });

  const loadMore = useCallback(() => {
    // The observer re-fires on rebuild, so fetching while errored would retry in a loop.
    if (!isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  if (isPending) {
    return <Spinner />;
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
          <Empty title={'Nothing is here, click on "Add Items" to show more'} />
          <Link to="/pieces/add" variant="text" leadingIcon={Plus}>
            Add Items
          </Link>
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
      {removeMutation.isError && (
        <Text variant="body" className="mb-md text-error">
          Couldn't remove that piece. Try again.
        </Text>
      )}
      <ul className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-4">
        {pieces.map((piece) => (
          <OwnedPieceCard
            key={piece.id}
            piece={piece}
            onRemove={
              editing ? () => removeMutation.mutate({ path: { product_id: piece.id } }) : undefined
            }
            removing={removeMutation.isPending}
          />
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
