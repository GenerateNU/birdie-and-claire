import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  addCurrentUserPiecesMutation,
  listCurrentUserPiecesInfiniteQueryKey,
  listProductsInfiniteOptions,
  listProductsInfiniteQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { ProductResponse } from "@/api/generated/types.gen";
import { zAddOwnedProductsInputBody } from "@/api/generated/zod.gen";
import {
  Box,
  Button,
  EmptyState,
  ErrorState,
  ItemCard,
  SidePanel,
  Skeleton,
  Text,
} from "@/design-system";
import { LoadMoreSentinel } from "@/features/pieces/load-more-sentinel";
import { usePagination } from "@/lib/use-pagination";

// The generated mutation options carry no key, so this names the picker's save for callers that
// need to know it is in flight, through useIsMutating.
export const addOwnedPiecesMutationKey = ["add-owned-pieces"];

type PiecePickerProps = {
  onAdded: () => void;
};

/** Picks catalog pieces the shopper owns and saves them. Onboarding and /pieces/add both use it. */
export function PiecePicker({ onAdded }: PiecePickerProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ProductResponse[]>([]);
  const [showingSelectedItems, setShowingSelectedItems] = useState(false);

  const addMutation = useMutation({
    ...addCurrentUserPiecesMutation(),
    mutationKey: addOwnedPiecesMutationKey,
    // The catalog leaves owned pieces out, so both lists change.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listCurrentUserPiecesInfiniteQueryKey() }),
        queryClient.invalidateQueries({ queryKey: listProductsInfiniteQueryKey() }),
      ]),
  });

  // A failed save's error is about the selection that was sent, so it clears once that changes.
  function changeSelection(next: ProductResponse[]) {
    addMutation.reset();
    setSelected(next);

    if (next.length === 0) {
      setShowingSelectedItems(false);
    }
  }

  function toggle(product: ProductResponse, pressed: boolean) {
    changeSelection(
      pressed ? [...selected, product] : selected.filter((picked) => picked.id !== product.id),
    );
  }

  function addSelected() {
    // On mutate, not useMutation: TanStack skips it once the picker unmounts, so leaving mid-save
    // doesn't move the user on.
    addMutation.mutate(
      { body: { product_ids: selected.map((product) => product.id) } },
      { onSuccess: onAdded },
    );
  }

  // Still saving while the caller moves on, so the button doesn't come back on in between.
  const saving = addMutation.isPending || addMutation.isSuccess;

  // Asks the add endpoint's own schema whether one more piece still fits in a request. The extra id's
  // value doesn't matter: only the count can fail.
  const atLimit = !zAddOwnedProductsInputBody.shape.product_ids.safeParse([
    ...selected.map((product) => product.id),
    "",
  ]).success;

  const selectedCount = `${selected.length} ${selected.length === 1 ? "Item" : "Items"} Selected`;

  const addButton = (
    <Button
      label="Add Items to Owned"
      loading={saving}
      loadingLabel="Adding…"
      disabled={selected.length === 0}
      onClick={addSelected}
    />
  );

  const addError = addMutation.isError && (
    <Text variant="body" className="text-center text-error">
      Couldn't add your pieces. Try again.
    </Text>
  );

  return (
    <Box className="flex flex-col gap-lg">
      {/* Scrolls inside part of the viewport so the buttons below stay in view, in the onboarding
          modal and on /pieces/add alike. A scroll box clips on every side, so the padding leaves
          room for the selected ring and hover outline outside the cards, and the negative margin
          keeps the grid where Figma puts it. */}
      <Box className="scrollbar-thin -m-sm max-h-[60vh] overflow-y-auto p-sm">
        <Catalog selected={selected} onToggle={toggle} disabled={saving} atLimit={atLimit} />
      </Box>
      {atLimit && (
        <Text variant="caption" className="text-center text-secondary">
          That's the most you can add at once.
        </Text>
      )}
      <Box className="flex justify-end gap-sm">
        <Button
          label={selectedCount}
          variant="secondary"
          disabled={selected.length === 0 || saving}
          onClick={() => setShowingSelectedItems(true)}
        />
        {addButton}
      </Box>
      {!showingSelectedItems && addError}
      <SidePanel
        open={showingSelectedItems}
        onClose={() => setShowingSelectedItems(false)}
        title="Selected Items"
        footer={
          <>
            {addButton}
            {addError}
          </>
        }
      >
        <Box role="list" className="grid grid-cols-2 gap-lg">
          {selected.map((product) => (
            <Box key={product.id} role="listitem">
              <ItemCard
                name={product.title}
                src={product.image_url}
                size="sm"
                onRemove={() =>
                  changeSelection(selected.filter((picked) => picked.id !== product.id))
                }
                disabled={saving}
              />
            </Box>
          ))}
        </Box>
      </SidePanel>
    </Box>
  );
}

type CatalogProps = {
  selected: ProductResponse[];
  onToggle: (product: ProductResponse, pressed: boolean) => void;
  disabled: boolean;
  // A selected card can still be unselected at the limit.
  atLimit: boolean;
};

function Catalog({ selected, onToggle, disabled, atLimit }: CatalogProps) {
  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = usePagination(listProductsInfiniteOptions({ query: { limit: 24 } }));

  const loadMore = useCallback(() => {
    // The observer re-fires on rebuild, so fetching while errored would retry in a loop.
    if (!isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  if (isPending) {
    return (
      <Box
        role="status"
        aria-label="Loading pieces"
        className="grid grid-cols-2 gap-md md:grid-cols-3"
      >
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="aspect-portrait" />
        ))}
      </Box>
    );
  }

  if (!data) {
    return <ErrorState message="Couldn't load the pieces." onRetry={() => void refetch()} />;
  }

  const products = data.pages.flatMap((page) => page.items);

  if (products.length === 0) {
    return <EmptyState title="You own every piece we have." />;
  }

  return (
    <>
      <ul className="grid grid-cols-4 gap-lg">
        {products.map((product) => {
          const pressed = selected.some((picked) => picked.id === product.id);

          return (
            <li key={product.id}>
              <ItemCard
                name={product.title}
                src={product.image_url}
                selection={{
                  selected: pressed,
                  onSelectedChange: (nextPressed) => onToggle(product, nextPressed),
                }}
                disabled={disabled || (atLimit && !pressed)}
              />
            </li>
          );
        })}
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
