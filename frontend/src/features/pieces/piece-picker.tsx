import { TrashIcon } from "@phosphor-icons/react";
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
  IconButton,
  ImageOptionCard,
  ItemCard,
  Spinner,
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

  return (
    <Box className="flex flex-col gap-md">
      <Box className="relative">
        {/* Scrolls inside part of the viewport so the buttons below stay in view, in the onboarding
            modal and on /pieces/add alike. */}
        <Box inert={showingSelectedItems} className="max-h-[60vh] overflow-y-auto pr-xs">
          <Catalog selected={selected} onToggle={toggle} disabled={saving} atLimit={atLimit} />
        </Box>
        {showingSelectedItems && (
          <SelectedItemsPanel
            selected={selected}
            onRemove={(product) =>
              changeSelection(selected.filter((picked) => picked.id !== product.id))
            }
            disabled={saving}
          />
        )}
      </Box>
      {atLimit && (
        <Text variant="caption" className="text-center text-secondary">
          That's the most you can add at once.
        </Text>
      )}
      <Box className="flex justify-center gap-xl">
        <Button
          label={selectedCount}
          accessibleLabel={showingSelectedItems ? "Back to the catalog" : undefined}
          variant="secondary"
          disabled={selected.length === 0 || saving}
          onClick={() => setShowingSelectedItems(!showingSelectedItems)}
        />
        <Button
          label="Add Items to Owned"
          loading={saving}
          loadingLabel="Adding…"
          disabled={selected.length === 0}
          onClick={addSelected}
        />
      </Box>
      {addMutation.isError && (
        <Text variant="body" className="text-center text-error">
          Couldn't add your pieces. Try again.
        </Text>
      )}
    </Box>
  );
}

type SelectedItemsPanelProps = {
  selected: ProductResponse[];
  onRemove: (product: ProductResponse) => void;
  disabled: boolean;
};

/** The picks so far, each with a remove button. Covers the right of the catalog. */
function SelectedItemsPanel({ selected, onRemove, disabled }: SelectedItemsPanelProps) {
  return (
    <Box className="absolute inset-y-0 right-0 flex w-3/5 flex-col gap-md overflow-y-auto border-l bg-card p-md shadow-modal">
      <Box className="flex flex-col items-center text-center">
        <Box className="text-label-l-strong">Selected Items</Box>
        <Text variant="body" className="text-secondary">
          You can always add more in your profile later!
        </Text>
      </Box>
      <ul className="grid grid-cols-2 gap-md">
        {selected.map((product) => (
          <li key={product.id} className="relative">
            <ItemCard name={product.title} src={product.image_url} size="sm" />
            <IconButton
              icon={TrashIcon}
              label={`Remove ${product.title}`}
              variant="secondary"
              size="sm"
              disabled={disabled}
              className="absolute right-xs top-xs"
              onClick={() => onRemove(product)}
            />
          </li>
        ))}
      </ul>
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
    return <Spinner />;
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
      <ul className="grid grid-cols-3 gap-lg">
        {products.map((product) => {
          const pressed = selected.some((picked) => picked.id === product.id);

          return (
            <li key={product.id}>
              <ImageOptionCard
                label={product.title}
                src={product.image_url}
                pressed={pressed}
                selection="multi"
                onPressedChange={(nextPressed) => onToggle(product, nextPressed)}
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
