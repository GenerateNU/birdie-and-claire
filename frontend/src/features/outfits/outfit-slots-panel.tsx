import { Box, OutfitSlot, Text } from "@/design-system";
import type { PanelTarget } from "@/features/outfits/editor-selection";
import type { DraftItem } from "@/features/outfits/outfit-draft";
import { SLOT_ORDER, SLOT_NAMES, type ProductSlot } from "@/features/outfits/outfit-items";

type OutfitSlotsPanelProps = {
  items: DraftItem[];
  panel: PanelTarget | null;
  onAdd: (slot: ProductSlot) => void;
  onSwap: (originId: string) => void;
};

/**
 * One card per piece in the draft, grouped by slot, and an empty card for each slot with nothing
 * in it. A slot can show more than one piece, such as two tops from a base, but only an empty
 * slot offers an add.
 */
export function OutfitSlotsPanel({ items, panel, onAdd, onSwap }: OutfitSlotsPanelProps) {
  const selectedOriginId = panel !== null && "originId" in panel ? panel.originId : null;

  return (
    <Box className="flex flex-col gap-md">
      <Text variant="subheading" className="uppercase">
        Add items
      </Text>
      <ul className="grid grid-cols-2 gap-md">
        {SLOT_ORDER.flatMap((slot) => {
          const filled = items.filter((item) => item.product.slot === slot);

          if (filled.length === 0) {
            return (
              <li key={slot}>
                <OutfitSlot title={SLOT_NAMES[slot].title} piece={null} onAdd={() => onAdd(slot)} />
              </li>
            );
          }

          return filled.map(({ product, original }) => (
            <li key={original.id}>
              <OutfitSlot
                title={SLOT_NAMES[slot].title}
                piece={{ src: product.image_url, bcStamp: product.source === "birdie_and_claire" }}
                onSwap={() => onSwap(original.id)}
                selected={original.id === selectedOriginId}
              />
            </li>
          ));
        })}
      </ul>
    </Box>
  );
}
