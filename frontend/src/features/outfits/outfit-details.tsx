import { Box, Divider, Empty, Text, TextButton } from "@/design-system";
import type { DraftItem } from "@/features/outfits/outfit-draft";
import { SLOTS_HEAD_TO_TOE } from "@/features/outfits/outfit-items";

type OutfitDetailsProps = {
  items: DraftItem[];
  onSwapItem: (originId: string) => void;
};

type ItemTileProps = {
  imageUrl: string | null;
};

function listPosition(item: DraftItem): number {
  return SLOTS_HEAD_TO_TOE.indexOf(item.product.slot);
}

export function OutfitDetails({ items, onSwapItem }: OutfitDetailsProps) {
  // sort is stable, so items that share a slot keep the draft's order.
  const sortedItems = [...items].sort((a, b) => listPosition(a) - listPosition(b));

  return (
    <section className="flex h-full flex-col border">
      <header className="px-xxl py-xs">
        <Text variant="heading">Outfit Details</Text>
      </header>
      <Divider />
      {sortedItems.length === 0 ? (
        <Empty title="This outfit has no items yet" className="px-xxl py-lg" />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto px-xxl py-lg">
          {sortedItems.map(({ product, originId }) => (
            <li key={originId} className="flex items-center gap-md border p-md">
              <Box className="flex shrink-0 flex-col items-center gap-xxs">
                <ItemTile imageUrl={product.image_url} />
                <TextButton
                  label="swap item"
                  accessibleLabel={`Swap item: ${product.title}`}
                  onClick={() => onSwapItem(originId)}
                />
              </Box>
              <Text variant="subheading">{product.title}</Text>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemTile({ imageUrl }: ItemTileProps) {
  return (
    <Box className="flex h-[149px] w-[136px] shrink-0 items-center justify-center bg-placeholder">
      {/* Decorative: the title next to it already names the item. multiply blends the photo's
          white background into the tile, as on the canvas. */}
      {imageUrl !== null && (
        <img src={imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply" />
      )}
    </Box>
  );
}
