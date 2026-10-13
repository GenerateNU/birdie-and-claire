import { CANVAS_SPOTS, spotFor, type ItemImage, type OutfitItem } from "./outfitItems";

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
    return CANVAS_SPOTS.length;
  }

  return CANVAS_SPOTS.indexOf(spot);
}

export default function OutfitDetails({ outfitName, items }: OutfitDetailsProps) {
  // sort is stable, so items that share a spot keep the API's order.
  const sortedItems = [...items].sort((a, b) => listPosition(a) - listPosition(b));

  return (
    <section className="flex h-full flex-col border border-black">
      <header className="border-b border-black px-[50px] py-[10px]">
        <h2 className="text-[28px] font-medium leading-[36px]">Outfit Details</h2>
        <p className="text-[16px] font-medium leading-[24px] tracking-[0.15px] text-[#656565]">
          {outfitName}
        </p>
      </header>
      {sortedItems.length === 0 ? (
        <p className="px-[47px] py-[24px] text-[16px] leading-[24px] text-[#656565]">
          This outfit has no items yet.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-[20px] overflow-y-auto px-[47px] py-[24px]">
          {sortedItems.map((item) => (
            <li
              key={item.product.id}
              className="flex items-center gap-[17px] border border-black p-[17px]"
            >
              <ItemTile image={item.image} />
              <span className="text-[24px] leading-[32px]">{item.product.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemTile({ image }: ItemTileProps) {
  return (
    <div className="flex h-[149px] w-[136px] shrink-0 items-center justify-center bg-[#d9d9d9]">
      {/* Decorative: the title next to it already names the item. multiply blends the photo's
          white background into the tile, as on the canvas. */}
      {image.status === "loaded" && (
        <img src={image.url} alt="" className="h-full w-full object-contain mix-blend-multiply" />
      )}
      {image.status === "failed" && (
        <span className="px-2 text-center text-[14px] leading-[20px]">Image failed to load</span>
      )}
    </div>
  );
}
