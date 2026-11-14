import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import {
  listBirdieAndClaireProductsInfiniteOptions,
  listCurrentUserPiecesInfiniteOptions,
  listCurrentUserPiecesInfiniteQueryKey,
  updateCurrentUserPiecesMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { BirdieAndClaireProductResponse, ProductResponse } from "@/api/generated/types.gen";
import { zUpdateOwnedProductsInputBody } from "@/api/generated/zod.gen";
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
  catalogCategories,
  invalidateBirdieAndClaireCatalog,
  type CatalogCategory,
} from "@/features/pieces/birdie-and-claire-catalog";
import { LoadMoreSentinel } from "@/features/pieces/load-more-sentinel";
import { usePagination } from "@/lib/use-pagination";

// The generated mutation options carry no key, so this names the picker's save for callers that
// need to know it is in flight, through useIsMutating.
export const saveOwnedPiecesMutationKey = ["save-owned-pieces"];

const categoryLabels: Record<CatalogCategory, string> = {
  tops: "Tops",
  sweaters: "Sweaters",
  bottoms: "Bottoms",
  jumpsuits: "Jumpsuits",
  accessories: "Accessories",
};

const categoryTabs = catalogCategories.map((category) => ({
  label: categoryLabels[category],
  value: category,
}));

type PiecePickerProps = {
  onAdded: () => void;
};

/** Picks the catalog pieces the shopper owns and saves the change. Pieces they already own start
 * selected, and unselecting one removes it. Onboarding and /pieces/add both use it. */
export function PiecePicker({ onAdded }: PiecePickerProps) {
  const queryClient = useQueryClient();
  const [added, setAdded] = useState<ProductResponse[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [showingSelectedItems, setShowingSelectedItems] = useState(false);
  const [category, setCategory] = useState<CatalogCategory>(catalogCategories[0]);

  const {
    data: ownedData,
    hasNextPage: hasMoreOwned,
    isFetchingNextPage: isFetchingMoreOwned,
    isFetchNextPageError: isOwnedPageError,
    fetchNextPage: fetchMoreOwned,
  } = usePagination(listCurrentUserPiecesInfiniteOptions({ query: { limit: 100 } }));

  // The count and the Selected Items panel cover every owned piece, not just the first page.
  useEffect(() => {
    if (hasMoreOwned && !isFetchingMoreOwned && !isOwnedPageError) {
      void fetchMoreOwned();
    }
  }, [hasMoreOwned, isFetchingMoreOwned, isOwnedPageError, fetchMoreOwned]);

  const ownedPieces = ownedData?.pages.flatMap((page) => page.items) ?? [];

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

  function keptOwned(nextRemovedIds: string[]) {
    return ownedPieces.filter((piece) => !nextRemovedIds.includes(piece.id));
  }

  // A failed save's error is about the change that was sent, so it clears once that changes.
  function changeSelection(nextAdded: ProductResponse[], nextRemovedIds: string[]) {
    saveMutation.reset();
    setAdded(nextAdded);
    setRemovedIds(nextRemovedIds);

    if (keptOwned(nextRemovedIds).length + nextAdded.length === 0) {
      setShowingSelectedItems(false);
    }
  }

  function isSelected(product: BirdieAndClaireProductResponse) {
    if (product.owned) {
      return !removedIds.includes(product.id);
    }

    return added.some((picked) => picked.id === product.id);
  }

  function toggle(product: BirdieAndClaireProductResponse, pressed: boolean) {
    if (product.owned) {
      changeSelection(
        added,
        pressed ? removedIds.filter((id) => id !== product.id) : [...removedIds, product.id],
      );

      return;
    }

    changeSelection(
      pressed ? [...added, product] : added.filter((picked) => picked.id !== product.id),
      removedIds,
    );
  }

  function unselect(product: ProductResponse) {
    if (added.some((picked) => picked.id === product.id)) {
      changeSelection(
        added.filter((picked) => picked.id !== product.id),
        removedIds,
      );

      return;
    }

    changeSelection(added, [...removedIds, product.id]);
  }

  const selected = [...keptOwned(removedIds), ...added];
  const hasChanges = added.length > 0 || removedIds.length > 0;

  function save() {
    // Pieces already owned and left as they are need no request, only the move on.
    if (!hasChanges) {
      onAdded();

      return;
    }

    // On mutate, not useMutation: TanStack skips it once the picker unmounts, so leaving mid-save
    // doesn't move the user on.
    saveMutation.mutate(
      {
        body: {
          add_product_ids: added.map((product) => product.id),
          remove_product_ids: removedIds,
        },
      },
      { onSuccess: onAdded },
    );
  }

  // Still saving while the caller moves on, so the button doesn't come back on in between.
  const saving = saveMutation.isPending || saveMutation.isSuccess;

  // Asks the save endpoint's own schema whether one more new piece still fits in a request. The
  // extra id's value doesn't matter: only the count can fail.
  const atLimit = !zUpdateOwnedProductsInputBody.shape.add_product_ids.safeParse([
    ...added.map((product) => product.id),
    "",
  ]).success;

  const selectedCount = `${selected.length} ${selected.length === 1 ? "Item" : "Items"} Selected`;

  const addButton = (
    <Button
      label="Add Items to Owned"
      loading={saving}
      loadingLabel="Adding…"
      disabled={!hasChanges && selected.length === 0}
      onClick={save}
    />
  );

  const saveErrorMessage = saveMutation.isError && (
    <Text variant="body" className="text-center text-error">
      Couldn't save your pieces. Try again.
    </Text>
  );

  return (
    <Box className="flex flex-col gap-lg">
      <TabBar
        tabs={categoryTabs}
        value={category}
        onValueChange={setCategory}
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
            category={category}
            isSelected={isSelected}
            onToggle={toggle}
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
          label={selectedCount}
          variant="secondary"
          disabled={selected.length === 0 || saving}
          onClick={() => setShowingSelectedItems(true)}
        />
        {addButton}
      </Box>
      {!showingSelectedItems && saveErrorMessage}
      <SidePanel
        open={showingSelectedItems}
        onClose={() => setShowingSelectedItems(false)}
        title="Selected Items"
        footer={
          <>
            {addButton}
            {saveErrorMessage}
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
                onRemove={() => unselect(product)}
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
  category: CatalogCategory;
  isSelected: (product: BirdieAndClaireProductResponse) => boolean;
  onToggle: (product: BirdieAndClaireProductResponse, pressed: boolean) => void;
  disabled: boolean;
  // Only blocks new pieces: a selected card can still be unselected, and an owned one reselected.
  atLimit: boolean;
};

function Catalog({ category, isSelected, onToggle, disabled, atLimit }: CatalogProps) {
  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = usePagination(listBirdieAndClaireProductsInfiniteOptions({ query: { category, limit: 24 } }));

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
