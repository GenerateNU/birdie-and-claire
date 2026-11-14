import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  CoatHangerIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  listProductsInfiniteOptions,
  suggestOutfitItemsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import {
  Box,
  Button,
  EmptyState,
  ErrorState,
  ItemCard,
  SearchField,
  Skeleton,
  Tabs,
  Text,
} from "@/design-system";
import { SLOT_NAMES, type Product, type ProductSlot } from "@/features/outfits/outfit-items";
import { canFetchNextPage } from "@/features/outfits/saved-outfits";
import { usePagination } from "@/lib/use-pagination";

/** The spot being swapped, or null when the picker fills an empty slot. */
type PickerSpot = { original: Product; currentProductId: string };

type SlotPickerProps = {
  slot: ProductSlot;
  spot: PickerSpot | null;
  /** The outfit to ask for suggestions, or null for a draft with no saved outfit behind it. */
  suggestionsOutfitId: string | null;
  /** Products held by the draft's other spots, which can't be picked again. */
  takenProductIds: Set<string>;
  onPick: (product: Product) => void;
  onBack: () => void;
};

type PickerTab = "suggested" | "owned" | "catalog";

const TAB_LABELS: Record<PickerTab, { label: string; icon: Icon }> = {
  suggested: { label: "Suggested", icon: SparkleIcon },
  owned: { label: "Items you own", icon: CoatHangerIcon },
  catalog: { label: "B&C catalog", icon: ArrowSquareOutIcon },
};

const SUGGESTION_LIMIT = 30;

// The list for a spot should hold still while the user picks from it.
const SUGGESTIONS_STALE_MS = 5 * 60 * 1000;

// The API's largest page. The catalog is a few dozen products, so this is usually the only page.
const CATALOG_PAGE_SIZE = 100;

function ignoreSearch() {}

/** Picks a product for one slot of the outfit: a swap for a filled spot, or an add for an empty slot. */
export function SlotPicker({
  slot,
  spot,
  suggestionsOutfitId,
  takenProductIds,
  onPick,
  onBack,
}: SlotPickerProps) {
  // Suggestions are products similar to the one in the spot, so they need a spot and an outfit.
  const suggestions =
    spot !== null && suggestionsOutfitId !== null
      ? { outfitId: suggestionsOutfitId, original: spot.original }
      : null;

  const tabs: PickerTab[] =
    suggestions === null ? ["owned", "catalog"] : ["suggested", "owned", "catalog"];

  const [tab, setTab] = useState<PickerTab>(suggestions === null ? "catalog" : "suggested");
  const { title, plural } = SLOT_NAMES[slot];
  const currentProductId = spot?.currentProductId ?? null;

  return (
    <Box className="flex h-full min-h-0 flex-col gap-md">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center">
        <Button
          label="Outfit"
          variant="ghost"
          size="sm"
          leadingIcon={ArrowLeftIcon}
          onClick={onBack}
          className="justify-self-start"
        />
        <Text variant="subheading">
          {spot === null ? "Add" : "Edit"} {title}
        </Text>
        <Text variant="caption" className="justify-self-end text-secondary">
          Click an item to {spot === null ? "add" : "swap"}
        </Text>
      </header>
      <SearchField
        label={`Search ${plural}`}
        placeholder={`Search ${plural}`}
        value=""
        onValueChange={ignoreSearch}
        onSubmit={ignoreSearch}
        inactive
        leadingIcon={MagnifyingGlassIcon}
      />
      <Tabs
        tabs={tabs.map((value) => ({ value, ...TAB_LABELS[value] }))}
        value={tab}
        onValueChange={setTab}
        disabled={false}
      >
        {tab === "suggested" && suggestions !== null && (
          <SuggestedItems
            outfitId={suggestions.outfitId}
            original={suggestions.original}
            currentProductId={currentProductId}
            takenProductIds={takenProductIds}
            onPick={onPick}
          />
        )}
        {tab === "owned" && <EmptyState title="Coming soon" />}
        {tab === "catalog" && (
          <CatalogItems
            slot={slot}
            currentProductId={currentProductId}
            takenProductIds={takenProductIds}
            onPick={onPick}
          />
        )}
      </Tabs>
    </Box>
  );
}

type SuggestedItemsProps = {
  outfitId: string;
  original: Product;
  currentProductId: string | null;
  takenProductIds: Set<string>;
  onPick: (product: Product) => void;
};

function SuggestedItems({
  outfitId,
  original,
  currentProductId,
  takenProductIds,
  onPick,
}: SuggestedItemsProps) {
  // Asked about the spot's original item, so the list doesn't change as the user swaps.
  const suggestionsQuery = useQuery({
    ...suggestOutfitItemsOptions({
      path: { id: outfitId },
      query: { product_id: [original.id], limit: SUGGESTION_LIMIT },
    }),
    staleTime: SUGGESTIONS_STALE_MS,
    refetchOnWindowFocus: false,
  });

  if (suggestionsQuery.isPending) {
    return <ItemsLoading label="Loading suggestions" />;
  }

  // Checked rather than isError, so a failed background refetch keeps the suggestions on screen.
  if (suggestionsQuery.data === undefined) {
    return (
      <ErrorState
        message="Couldn't load suggestions."
        onRetry={() => void suggestionsQuery.refetch()}
      />
    );
  }

  // The original leads, so the user can swap back to it.
  const products = [original, ...(suggestionsQuery.data.suggestions[original.id] ?? [])];

  return (
    <ItemGrid
      products={products.filter((product) => !takenProductIds.has(product.id))}
      currentProductId={currentProductId}
      emptyTitle="No suggestions yet"
      onPick={onPick}
    />
  );
}

type CatalogItemsProps = {
  slot: ProductSlot;
  currentProductId: string | null;
  takenProductIds: Set<string>;
  onPick: (product: Product) => void;
};

function CatalogItems({ slot, currentProductId, takenProductIds, onPick }: CatalogItemsProps) {
  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = usePagination(listProductsInfiniteOptions({ query: { limit: CATALOG_PAGE_SIZE } }));

  // The products endpoint can't filter by slot, so the whole catalog loads and is filtered here.
  const loadingMore = hasNextPage && canFetchNextPage({ isFetchingNextPage, isFetchNextPageError });

  useEffect(() => {
    if (loadingMore) {
      void fetchNextPage();
    }
  }, [loadingMore, fetchNextPage]);

  if (isPending || loadingMore || isFetchingNextPage) {
    return <ItemsLoading label="Loading the catalog" />;
  }

  if (data === undefined) {
    return <ErrorState message="Couldn't load the catalog." onRetry={() => void refetch()} />;
  }

  // A slot's products can be on any page, so a missing page means the list can't be trusted yet.
  if (isFetchNextPageError) {
    return <ErrorState message="Couldn't load the catalog." onRetry={() => void fetchNextPage()} />;
  }

  const products = data.pages
    .flatMap((page) => page.items)
    .filter((product) => product.slot === slot && !takenProductIds.has(product.id));

  return (
    <ItemGrid
      products={products}
      currentProductId={currentProductId}
      emptyTitle="Nothing in the catalog for this slot yet"
      onPick={onPick}
    />
  );
}

type ItemGridProps = {
  products: Product[];
  currentProductId: string | null;
  emptyTitle: string;
  onPick: (product: Product) => void;
};

function ItemGrid({ products, currentProductId, emptyTitle, onPick }: ItemGridProps) {
  if (products.length === 0) {
    return <EmptyState title={emptyTitle} />;
  }

  return (
    <ul className="flex flex-wrap gap-md p-xxs">
      {products.map((product) => (
        <li key={product.id}>
          <ItemCard
            name={product.title}
            src={product.image_url}
            bcStamp={product.source === "birdie_and_claire"}
            size="sm"
            selection={{
              selected: product.id === currentProductId,
              onSelectedChange: (selected) => {
                if (selected) {
                  onPick(product);
                }
              },
            }}
          />
        </li>
      ))}
    </ul>
  );
}

function ItemsLoading({ label }: { label: string }) {
  return (
    <Box role="status" aria-label={label} className="flex flex-wrap gap-md p-xxs">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-item-sm w-item-sm" />
      ))}
    </Box>
  );
}
