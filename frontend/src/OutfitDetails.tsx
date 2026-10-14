import { Empty, Text } from "@/design-system";
import { SPOTS_HEAD_TO_TOE, spotFor, type ItemImage, type OutfitItem } from "@/outfitItems";

type OutfitDetailsProps = {
  outfitName: string;
  items: OutfitItem[];
};

type ItemTileProps = {
  image: ItemImage;
};

/** Head to toe, matching the canvas. Items with no canvas spot go last. */
function listPosition(item: OutfitItem): number {
  const spot = spotFor(item.product.product_type);

  if (spot === undefined) {
    return SPOTS_HEAD_TO_TOE.length;
  }

  return SPOTS_HEAD_TO_TOE.indexOf(spot);
}

export default function OutfitDetails({ outfitName, items }: OutfitDetailsProps) {
  // sort is stable, so items that share a spot keep the API's order.
  const sortedItems = [...items].sort((a, b) => listPosition(a) - listPosition(b));

  return (
    <section className="flex h-full flex-col border">
      <header className="border-b px-xxl py-xs">
        <Text variant="heading">Outfit Details</Text>
        <Text variant="body" className="text-secondary">
          {outfitName}
        </Text>
      </header>
      {sortedItems.length === 0 ? (
        <Empty title="This outfit has no items yet" className="px-xxl py-lg" />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto px-xxl py-lg">
          {sortedItems.map((item) => (
            <li key={item.product.id} className="flex items-center gap-md border p-md">
              <ItemTile image={item.image} />
              <span className="text-subheading">{item.product.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemTile({ image }: ItemTileProps) {
  return (
    <div className="flex h-[149px] w-[136px] shrink-0 items-center justify-center bg-placeholder">
      {/* Decorative: the title next to it already names the item. multiply blends the photo's
          white background into the tile, as on the canvas. */}
      {image.status === "loaded" && (
        <img src={image.url} alt="" className="h-full w-full object-contain mix-blend-multiply" />
      )}
      {image.status === "failed" && (
        <span className="px-xs text-center text-caption">Image failed to load</span>
      )}
    </div>
  );
}
