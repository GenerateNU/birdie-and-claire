import { describe, expect, test } from "bun:test";

import { OutfitCardSize } from "@/design-system/tokens/layout";
import { cardCropRange } from "@/features/outfits/outfit-canvas-stage";
import { placeOnCanvas, type Product } from "@/features/outfits/outfit-items";

// One product for every spot a garment can take: two tops, a bottom, a one-piece, a pair of shoes,
// and three accessories.
const SLOTS: Product["slot"][] = [
  "top",
  "top",
  "bottom",
  "one_piece",
  "shoe",
  "accessory",
  "accessory",
  "accessory",
];

describe("the outfit card's crop of the canvas", () => {
  test("shows every spot a garment can take", () => {
    const placements = placeOnCanvas(
      SLOTS.map((slot, index) => ({
        id: `${slot}-${index}`,
        title: slot,
        slot,
        image_url: `https://example.com/${index}.png`,
      })),
    );

    // A product left without a spot would leave that spot out of the check below.
    expect(placements).toHaveLength(SLOTS.length);

    // The tokens are strings like "240px", and parseFloat drops the unit.
    const crop = cardCropRange({
      width: parseFloat(OutfitCardSize.width),
      height: parseFloat(OutfitCardSize.imageHeight),
    });

    const cropped = placements
      .map(({ product, spot }) => ({
        product: product.id,
        left: spot.centerX - spot.garmentWidth / 2,
        right: spot.centerX + spot.garmentWidth / 2,
      }))
      .filter(({ left, right }) => left < crop.left || right > crop.right)
      .map(
        ({ product, left, right }) =>
          `${product} spans x ${left} to ${right}, but the card shows ${crop.left} to ${crop.right} (canvas px)`,
      );

    // This pins the numbers. No layout runs under bun test, so it can't see the stage's CSS.
    expect(cropped).toEqual([]);
  });
});
