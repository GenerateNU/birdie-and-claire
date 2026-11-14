import { Box, Divider, EmptyState, Text, TextButton } from "@/design-system";
import type { DraftItem } from "@/features/outfits/outfit-draft";

type OutfitDetailsProps = {
  items: DraftItem[];
  onSwapItem: (originId: string) => void;
};

type ItemTileProps = {
  imageUrl: string | null;
};

export function OutfitDetails({ items, onSwapItem }: OutfitDetailsProps) {
  return (
    <section className="flex h-full flex-col border">
      <header className="px-xxxl py-xs">
        <Text variant="heading">Outfit Details</Text>
      </header>
      <Divider />
      {items.length === 0 ? (
        <EmptyState title="This outfit has no items yet" className="px-xxxl" />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto px-xxxl py-lg">
          {items.map(({ product, original }) => (
            <li key={original.id} className="flex items-center gap-md border p-md">
              <Box className="flex shrink-0 flex-col items-center gap-xxs">
                <ItemTile imageUrl={product.image_url} />
                <TextButton
                  label="swap item"
                  accessibleLabel={`Swap item: ${product.title}`}
                  onClick={() => onSwapItem(original.id)}
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
