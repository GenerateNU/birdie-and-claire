import { Empty, Text } from "@/design-system";
import type { Product } from "@/outfitItems";

type OutfitDetailsProps = {
  outfitName: string;
  products: Product[];
};

type ItemTileProps = {
  imageUrl: string | null;
};

export default function OutfitDetails({ outfitName, products }: OutfitDetailsProps) {
  return (
    <section className="flex h-full flex-col border">
      <header className="border-b px-xxl py-xs">
        <Text variant="heading">Outfit Details</Text>
        <Text variant="body" className="text-secondary">
          {outfitName}
        </Text>
      </header>
      {products.length === 0 ? (
        <Empty title="This outfit has no items yet" className="px-xxl py-lg" />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto px-xxl py-lg">
          {products.map((product) => (
            <li key={product.id} className="flex items-center gap-md border p-md">
              <ItemTile imageUrl={product.image_url} />
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
    <div className="flex h-[149px] w-[136px] shrink-0 items-center justify-center bg-placeholder">
      {/* Decorative: the title next to it already names the item. multiply blends the photo's
          white background into the tile, as on the canvas. */}
      {imageUrl !== null && (
        <img src={imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply" />
      )}
    </div>
  );
}
