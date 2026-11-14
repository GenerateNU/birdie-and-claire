import { EmptyState, OutfitSlot, SectionHeader } from "@/design-system";
import type { DraftItem } from "@/features/outfits/outfit-draft";

type OutfitDetailsProps = {
  items: DraftItem[];
  onSwapItem: (originId: string) => void;
};

export function OutfitDetails({ items, onSwapItem }: OutfitDetailsProps) {
  return (
    <section className="flex h-full flex-col gap-md border px-xl py-lg">
      <SectionHeader title="Outfit details" />
      {items.length === 0 ? (
        <EmptyState title="This outfit has no items yet" />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-wrap content-start gap-md overflow-y-auto">
          {items.map(({ product, original }) => (
            <li key={original.id}>
              <OutfitSlot
                title={product.title}
                piece={{
                  src: product.image_url,
                  bcStamp: product.source === "birdie_and_claire",
                }}
                onSwap={() => onSwapItem(original.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
