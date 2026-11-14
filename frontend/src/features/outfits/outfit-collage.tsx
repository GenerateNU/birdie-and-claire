import { Box } from "@/design-system";
import { GarmentImage, useDrawnGarments } from "@/features/outfits/outfit-canvas-stage";
import { CANVAS_SIZE, type Product } from "@/features/outfits/outfit-items";

type OutfitCollageProps = {
  products: Product[];
};

/** The pieces placed as on the outfit canvas, without its silhouette or padding, sized to the width it gets. */
export function OutfitCollage({ products }: OutfitCollageProps) {
  const drawnGarments = useDrawnGarments(products);

  return (
    <Box className="flex size-full items-center">
      <Box
        className="relative isolate w-full"
        style={{ aspectRatio: `${CANVAS_SIZE.width} / ${CANVAS_SIZE.height}` }}
      >
        {drawnGarments.map((drawn) => (
          <GarmentImage key={drawn.product.id} drawn={drawn} />
        ))}
      </Box>
    </Box>
  );
}
