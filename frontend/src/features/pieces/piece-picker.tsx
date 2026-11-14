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
  ImageOptionCard,
  Skeleton,
  Text,
} from "@/design-system";
import { LoadMoreSentinel } from "@/features/pieces/load-more-sentinel";
import { usePagination } from "@/lib/use-pagination";

type PiecePickerProps = {
  onAdded: () => void;
};

/** Picks catalog pieces the shopper owns and saves them. Onboarding and /pieces/add both use it. */
export function PiecePicker({ onAdded }: PiecePickerProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ProductResponse[]>([]);

  const addMutation = useMutation({
    ...addCurrentUserPiecesMutation(),
    // The catalog leaves owned pieces out, so both lists change.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listCurrentUserPiecesInfiniteQueryKey() }),
        queryClient.invalidateQueries({ queryKey: listProductsInfiniteQueryKey() }),
      ]),
  });

  function toggle(product: ProductResponse, pressed: boolean) {
    setSelected((current) =>
      pressed ? [...current, product] : current.filter((picked) => picked.id !== product.id),
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

  return (
    <Box className="flex flex-col gap-lg">
      <Text variant="heading">Add B&C Clothes You Own</Text>

      <Box className="flex flex-col gap-lg lg:flex-row lg:items-start">
        <Box className="min-w-0 flex-1">
          <Catalog selected={selected} onToggle={toggle} disabled={saving} atLimit={atLimit} />
        </Box>

        <Box className="flex flex-col gap-sm border p-md lg:sticky lg:top-md lg:w-1/4">
          <Text variant="body">
            {selected.length} {selected.length === 1 ? "item" : "items"} selected
          </Text>
          {atLimit && (
            <Text variant="caption" className="text-secondary">
              That's the most you can add at once.
            </Text>
          )}
          {selected.length > 0 && (
            <ul className="grid grid-cols-2 gap-xs">
              {selected.map((product) => (
                <li key={product.id}>
                  <Text variant="caption">{product.title}</Text>
                </li>
              ))}
            </ul>
          )}
          <Button
            label="Add Items to Owned"
            loading={saving}
            loadingLabel="Adding…"
            disabled={selected.length === 0}
            onClick={addSelected}
          />
          {addMutation.isError && (
            <Text variant="body" className="text-error">
              Couldn't add your pieces. Try again.
            </Text>
          )}
        </Box>
      </Box>
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
      <ul className="grid grid-cols-2 gap-md md:grid-cols-3">
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
