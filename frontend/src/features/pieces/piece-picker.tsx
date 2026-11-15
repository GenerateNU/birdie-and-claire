import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  listBirdieAndClaireProductsInfiniteOptions,
  listCurrentUserPiecesInfiniteQueryKey,
  updateCurrentUserPiecesMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type {
  BirdieAndClaireProductResponse,
  ListBirdieAndClaireProductsData,
} from "@/api/generated/types.gen";
import {
  Box,
  Button,
  EmptyState,
  ErrorState,
  ItemCard,
  SearchField,
  SidePanel,
  Skeleton,
  TabBar,
  Text,
} from "@/design-system";
import {
  catalogTabs,
  invalidateBirdieAndClaireCatalog,
  ownedCatalogFilter,
} from "@/features/pieces/birdie-and-claire-catalog";
import { LoadMoreSentinel } from "@/features/pieces/load-more-sentinel";
import {
  hasChanges,
  isAtAddLimit,
  isPicked,
  noChanges,
  pickedCount,
  pickedPieces,
  withPicked,
  type PieceSelection,
} from "@/features/pieces/piece-selection";
import { usePagination } from "@/lib/use-pagination";

// The generated mutation options carry no key, so this names the picker's save for callers that
// need to know it is in flight, through useIsMutating.
export const saveOwnedPiecesMutationKey = ["save-owned-pieces"];

// Three rows of the four-column grid, and twelve of the panel's two.
const pageSize = 24;

type PiecePickerProps = {
  onSaved: () => void;
};

/** Picks the catalog pieces the shopper owns and saves the change. Pieces they already own start
 * selected, and unselecting one removes it. Onboarding and /pieces/add both use it. */
export function PiecePicker({ onSaved }: PiecePickerProps) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<PieceSelection>(noChanges);
  const [showingSelectedItems, setShowingSelectedItems] = useState(false);
  const [tabValue, setTabValue] = useState(catalogTabs[0].value);
  const tab = catalogTabs.find((catalogTab) => catalogTab.value === tabValue) ?? catalogTabs[0];

  const {
    data: ownedData,
    hasNextPage: hasMoreOwned,
    isFetchingNextPage: isFetchingMoreOwned,
    isFetchNextPageError: isOwnedPageError,
    fetchNextPage: fetchMoreOwned,
  } = usePagination(
    listBirdieAndClaireProductsInfiniteOptions({
      query: { ...ownedCatalogFilter, limit: pageSize },
    }),
  );

  const loadMoreOwned = useCallback(() => {
    // The observer re-fires on rebuild, so fetching while errored would retry in a loop.
    if (!isFetchingMoreOwned && !isOwnedPageError) {
      void fetchMoreOwned();
    }
  }, [fetchMoreOwned, isFetchingMoreOwned, isOwnedPageError]);

  const ownedPieces = ownedData?.pages.flatMap((page) => page.items) ?? [];
  const ownedTotal = ownedData?.pages[0]?.total ?? 0;

  const saveMutation = useMutation({
    ...updateCurrentUserPiecesMutation(),
    mutationKey: saveOwnedPiecesMutationKey,
    // The owned list and the catalog's owned marks both change.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listCurrentUserPiecesInfiniteQueryKey() }),
        invalidateBirdieAndClaireCatalog(queryClient),
      ]),
  });

  // A failed save's error is about the change that was sent, so it clears once that changes.
  function changeSelection(nextSelection: PieceSelection) {
    saveMutation.reset();
    setSelection(nextSelection);

    if (pickedCount(nextSelection, ownedTotal) === 0) {
      setShowingSelectedItems(false);
    }
  }

  function save() {
    // Pieces already owned and left as they are need no request, only the move on.
    if (!hasChanges(selection)) {
      onSaved();

      return;
    }

    // On mutate, not useMutation: TanStack skips it once the picker unmounts, so leaving mid-save
    // doesn't move the user on.
    saveMutation.mutate(
      {
        body: {
          add_product_ids: selection.added.map((product) => product.id),
          remove_product_ids: selection.removedIds,
        },
      },
      { onSuccess: onSaved },
    );
  }

  // Still saving while the caller moves on, so the button doesn't come back on in between.
  const saving = saveMutation.isPending || saveMutation.isSuccess;
  const atLimit = isAtAddLimit(selection);
  const selectedCount = pickedCount(selection, ownedTotal);
  // Changes with no picks left still save: unpicking every owned piece removes them all.
  const nothingToSave = !hasChanges(selection) && selectedCount === 0;

  return (
    <Box className="flex flex-col gap-lg">
      <TabBar
        tabs={catalogTabs}
        value={tab.value}
        onValueChange={setTabValue}
        disabled={saving}
        trailing={
          // Disabled until the API can search products (#194).
          <SearchField
            variant="bare"
            leadingIcon={MagnifyingGlassIcon}
            label="Search items"
            placeholder="Search items"
            value=""
            onValueChange={() => {}}
            onSubmit={() => {}}
            disabled
            className="w-full"
          />
        }
      >
        {/* A fixed height, so the modal keeps one size whichever tab is open. A scroll box clips
            on every side, so the padding leaves room for the selected ring and hover outline
            outside the cards, and the negative margin keeps the grid where Figma puts it. */}
        <Box className="scrollbar-thin -m-sm h-item-grid overflow-y-auto p-sm">
          <Catalog
            filter={tab.filter}
            isSelected={(product) => isPicked(selection, product)}
            onToggle={(product, pressed) =>
              changeSelection(withPicked(selection, product, pressed))
            }
            disabled={saving}
            atLimit={atLimit}
          />
        </Box>
      </TabBar>
      {atLimit && (
        <Text variant="caption" className="text-center text-secondary">
          That's the most you can add at once.
        </Text>
      )}
      <Box className="flex justify-end gap-sm">
        <Button
          label={`${selectedCount} ${selectedCount === 1 ? "Item" : "Items"} Selected`}
          variant="secondary"
          disabled={selectedCount === 0 || saving}
          onClick={() => setShowingSelectedItems(true)}
        />
        <AddItemsButton saving={saving} nothingToSave={nothingToSave} onClick={save} />
      </Box>
      {/* The panel covers this footer, so the error shows in the panel while it is open. */}
      {saveMutation.isError && !showingSelectedItems && <SaveError />}
      <SidePanel
        open={showingSelectedItems}
        onClose={() => setShowingSelectedItems(false)}
        title="Selected Items"
        footer={
          <>
            <AddItemsButton saving={saving} nothingToSave={nothingToSave} onClick={save} />
            {saveMutation.isError && <SaveError />}
          </>
        }
      >
        <ul className="grid grid-cols-2 gap-lg">
          {pickedPieces(selection, ownedPieces).map((product) => (
            <li key={product.id}>
              <ItemCard
                name={product.title}
                src={product.image_url}
                size="sm"
                onRemove={() => changeSelection(withPicked(selection, product, false))}
                disabled={saving}
              />
            </li>
          ))}
          {hasMoreOwned && <LoadMoreSentinel onVisible={loadMoreOwned} />}
        </ul>
      </SidePanel>
    </Box>
  );
}

type AddItemsButtonProps = {
  saving: boolean;
  nothingToSave: boolean;
  onClick: () => void;
};

function AddItemsButton({ saving, nothingToSave, onClick }: AddItemsButtonProps) {
  return (
    <Button
      label="Add Items to Owned"
      loading={saving}
      loadingLabel="Saving…"
      disabled={nothingToSave}
      onClick={onClick}
    />
  );
}

function SaveError() {
  return (
    <Text variant="body" className="text-center text-error">
      Couldn't save your pieces. Try again.
    </Text>
  );
}

type CatalogProps = {
  filter: Omit<ListBirdieAndClaireProductsData["query"], "limit" | "cursor">;
  isSelected: (product: BirdieAndClaireProductResponse) => boolean;
  onToggle: (product: BirdieAndClaireProductResponse, pressed: boolean) => void;
  disabled: boolean;
  // Only blocks new pieces: a selected card can still be unselected, and an owned one reselected.
  atLimit: boolean;
};

function Catalog({ filter, isSelected, onToggle, disabled, atLimit }: CatalogProps) {
  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = usePagination(
    listBirdieAndClaireProductsInfiniteOptions({ query: { ...filter, limit: pageSize } }),
  );

  const loadMore = useCallback(() => {
    // The observer re-fires on rebuild, so fetching while errored would retry in a loop.
    if (!isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  if (isPending) {
    return (
      <Box role="status" aria-label="Loading pieces" className="grid grid-cols-4 gap-lg">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
          <Skeleton key={item} className="h-item-md w-item-md" />
        ))}
      </Box>
    );
  }

  if (!data) {
    return <ErrorState message="Couldn't load the pieces." onRetry={() => void refetch()} />;
  }

  const products = data.pages.flatMap((page) => page.items);

  if (products.length === 0) {
    return <EmptyState title="No pieces in this category yet." />;
  }

  return (
    <>
      <ul className="grid grid-cols-4 gap-lg">
        {products.map((product) => {
          const pressed = isSelected(product);

          return (
            <li key={product.id}>
              <ItemCard
                name={product.title}
                src={product.image_url}
                selection={{
                  selected: pressed,
                  onSelectedChange: (nextPressed) => onToggle(product, nextPressed),
                }}
                disabled={disabled || (atLimit && !pressed && !product.owned)}
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
