import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  addCurrentUserPiecesMutation,
  listBirdieAndClaireProductsInfiniteOptions,
  listCurrentUserPiecesInfiniteQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { ProductResponse } from "@/api/generated/types.gen";
import { zAddOwnedProductsInputBody } from "@/api/generated/zod.gen";
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
export const addOwnedPiecesMutationKey = ["add-owned-pieces"];

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

/** Picks catalog pieces the shopper owns and saves them. Onboarding and /pieces/add both use it. */
export function PiecePicker({ onAdded }: PiecePickerProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ProductResponse[]>([]);
  const [showingSelectedItems, setShowingSelectedItems] = useState(false);
  const [category, setCategory] = useState<CatalogCategory>(catalogCategories[0]);

  const addMutation = useMutation({
    ...addCurrentUserPiecesMutation(),
    mutationKey: addOwnedPiecesMutationKey,
    // The catalog leaves owned pieces out, so both lists change.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listCurrentUserPiecesInfiniteQueryKey() }),
        invalidateBirdieAndClaireCatalog(queryClient),
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
        {/* Scrolls inside part of the viewport so the buttons below stay in view, in the
            onboarding modal and on /pieces/add alike. A scroll box clips on every side, so the
            padding leaves room for the selected ring and hover outline outside the cards, and
            the negative margin keeps the grid where Figma puts it. */}
        <Box className="scrollbar-thin -m-sm max-h-[60vh] overflow-y-auto p-sm">
          <Catalog
            category={category}
            selected={selected}
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
  category: CatalogCategory;
  selected: ProductResponse[];
  onToggle: (product: ProductResponse, pressed: boolean) => void;
  disabled: boolean;
  // A selected card can still be unselected at the limit.
  atLimit: boolean;
};

function Catalog({ category, selected, onToggle, disabled, atLimit }: CatalogProps) {
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
    return <EmptyState title="You own every piece in this category." />;
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
