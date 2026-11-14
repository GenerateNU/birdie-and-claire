import { CaretLeftIcon, DiamondsFourIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { suggestOutfitItemsOptions } from "@/api/generated/@tanstack/react-query.gen";
import {
  Box,
  EmptyState,
  ErrorState,
  IconButton,
  ImageOptionCard,
  SearchField,
  Spinner,
  Tabs,
  Text,
} from "@/design-system";
import type { DraftItem } from "@/features/outfits/outfit-draft";
import { OutfitDetails } from "@/features/outfits/outfit-details";
import type { Product } from "@/features/outfits/outfit-items";

type SwapPanelProps = {
  outfitId: string;
  items: DraftItem[];
  originId: string | null;
  onSwap: (originId: string, product: Product) => void;
  onPickSpot: (originId: string) => void;
  onBack: () => void;
};

type SpotSwapPanelProps = Omit<SwapPanelProps, "originId" | "onPickSpot"> & { originId: string };

type SuggestedTilesProps = {
  outfitId: string;
  originId: string;
  original: Product;
  currentProductId: string;
  otherSpotProductIds: Set<string>;
  onSwap: (originId: string, product: Product) => void;
};

type SwapTab = "suggested" | "owned" | "catalog";

const TAB_ORDER: SwapTab[] = ["suggested", "owned", "catalog"];

const SLOT_NAMES: Record<Product["slot"], { heading: string; plural: string }> = {
  top: { heading: "TOP", plural: "Tops" },
  bottom: { heading: "BOTTOM", plural: "Bottoms" },
  shoe: { heading: "SHOE", plural: "Shoes" },
  accessory: { heading: "ACCESSORY", plural: "Accessories" },
};

const SUGGESTION_LIMIT = 30;

// The list for a spot should hold still while the user picks from it.
const SUGGESTIONS_STALE_MS = 5 * 60 * 1000;

function tabLabel(tab: SwapTab, slot: Product["slot"]): string {
  switch (tab) {
    case "suggested":
      return "Suggested";
    case "owned":
      return `${SLOT_NAMES[slot].plural} You Own`;
    case "catalog":
      return "Birdie & Claire Catalog";
  }
}

function ignoreSearch() {}

/** Edits one spot of the outfit, or shows the outfit's details while no spot is picked. */
export function SwapPanel({ originId, onPickSpot, ...spotProps }: SwapPanelProps) {
  if (originId === null) {
    return <OutfitDetails items={spotProps.items} onSwapItem={onPickSpot} />;
  }

  // Keyed by spot, so a new spot starts on the Suggested tab.
  return <SpotSwapPanel key={originId} originId={originId} {...spotProps} />;
}

function SpotSwapPanel({ outfitId, items, originId, onSwap, onBack }: SpotSwapPanelProps) {
  const [tab, setTab] = useState<SwapTab>("suggested");

  const current = items.find((item) => item.original.id === originId);

  // The selection hook drops a spot once it leaves the draft.
  if (current === undefined) {
    throw new Error(`swap panel: no spot ${originId} in the draft`);
  }

  const { original } = current;

  const { slot } = current.product;
  // Swapping between a one-piece and a top and bottom isn't decided yet.
  const swappable = slot !== "one_piece";
  const otherSpotProductIds = new Set<string>();

  for (const item of items) {
    if (item.original.id !== originId) {
      otherSpotProductIds.add(item.product.id);
    }
  }

  return (
    <section className="flex h-full flex-col gap-md border px-xl py-lg">
      <header className="flex items-center gap-xs">
        <IconButton
          icon={CaretLeftIcon}
          label="Back to outfit details"
          variant="ghost"
          onClick={onBack}
        />
        <Text variant="subheading">EDIT {SLOT_NAMES[slot].heading}</Text>
        {swappable && (
          <Text variant="body" className="ml-auto text-secondary">
            Click on an item to swap
          </Text>
        )}
      </header>
      {swappable ? (
        <>
          <SearchField
            label="Search items"
            placeholder="Search items"
            value=""
            onValueChange={ignoreSearch}
            onSubmit={ignoreSearch}
            inactive
            leadingIcon={MagnifyingGlassIcon}
          />
          <Tabs
            tabs={TAB_ORDER.map((value) => ({
              value,
              label: tabLabel(value, slot),
              icon: DiamondsFourIcon,
            }))}
            value={tab}
            onValueChange={setTab}
            disabled={false}
            appearance="underline"
          >
            {tab === "suggested" ? (
              <SuggestedTiles
                outfitId={outfitId}
                originId={originId}
                original={original}
                currentProductId={current.product.id}
                otherSpotProductIds={otherSpotProductIds}
                onSwap={onSwap}
              />
            ) : (
              <EmptyState title="Coming soon" />
            )}
          </Tabs>
        </>
      ) : (
        <EmptyState title="One-pieces can't be swapped yet" />
      )}
    </section>
  );
}

function SuggestedTiles({
  outfitId,
  originId,
  original,
  currentProductId,
  otherSpotProductIds,
  onSwap,
}: SuggestedTilesProps) {
  // Asked about the spot's original item, so the list doesn't change as the user swaps.
  const suggestionsQuery = useQuery({
    ...suggestOutfitItemsOptions({
      path: { id: outfitId },
      query: { product_id: [originId], limit: SUGGESTION_LIMIT },
    }),
    staleTime: SUGGESTIONS_STALE_MS,
    refetchOnWindowFocus: false,
  });

  if (suggestionsQuery.isPending) {
    return <Spinner />;
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

  const suggestions = suggestionsQuery.data.suggestions[originId] ?? [];

  // A product in another spot can't be swapped in, since a draft holds each product once.
  const tiles = [original, ...suggestions].filter(
    (product) => !otherSpotProductIds.has(product.id),
  );

  if (!tiles.some((product) => product.id !== original.id)) {
    return <EmptyState title="No suggestions yet" />;
  }

  return (
    <Box className="grid grid-cols-3 gap-md">
      {tiles.map((product) => (
        <ImageOptionCard
          key={product.id}
          label={product.title}
          src={product.image_url}
          pressed={product.id === currentProductId}
          onPressedChange={(pressed) => {
            if (pressed) {
              onSwap(originId, product);
            }
          }}
        />
      ))}
    </Box>
  );
}
