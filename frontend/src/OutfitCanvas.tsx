import { useQueries } from "@tanstack/react-query";
import type { CSSProperties } from "react";

import silhouette from "@/assets/silhouette.png";
import { Button } from "@/design-system";
import { cutOutGarment, type GarmentBox } from "@/garmentCutout";
import { CANVAS_SIZE, placeOnCanvas, type CanvasSpot, type Product } from "@/outfitItems";

type OutfitCanvasProps = {
  products: Product[];
};

// Where the Figma draws silhouette.png, in canvas pixels.
const SILHOUETTE_BOX = { left: 241, top: -6, width: 446, height: 792 };

// For a photo that couldn't be cut out, the garment's box is unknown.
const WHOLE_PHOTO: GarmentBox = { left: 0, top: 0, right: 1, bottom: 1 };

// Percentages of the canvas, so everything on it scales together and keeps the Figma's proportions.
function percentOfWidth(pixels: number): string {
  return `${(pixels / CANVAS_SIZE.width) * 100}%`;
}

function percentOfHeight(pixels: number): string {
  return `${(pixels / CANVAS_SIZE.height) * 100}%`;
}

/**
 * Puts the garment, not the whole photo, on the spot. translate percentages are of the image's own
 * size, so this works without knowing the photo's height.
 */
function garmentPlacement(spot: CanvasSpot, garment: GarmentBox): CSSProperties {
  const photoWidth = spot.garmentWidth / (garment.right - garment.left);
  const anchoredEdge = spot.anchor.edge === "top" ? garment.top : garment.bottom;

  return {
    left: percentOfWidth(spot.centerX - spot.garmentWidth / 2),
    top: percentOfHeight(spot.anchor.y),
    width: percentOfWidth(photoWidth),
    transform: `translate(${-garment.left * 100}%, ${-anchoredEdge * 100}%)`,
    zIndex: spot.layer,
  };
}

export default function OutfitCanvas({ products }: OutfitCanvasProps) {
  const placedItems = placeOnCanvas(products);

  const cutouts = useQueries({
    queries: placedItems.map(({ photoUrl }) => ({
      queryKey: ["garment-cutout", photoUrl],
      queryFn: () => cutOutGarment(photoUrl),
      // A cut-out depends only on its photo.
      staleTime: Infinity,
      // One retry covers a network blip. A host that blocks cross-origin reads fails every time.
      retry: 1,
      // A failed cut-out has no data, so a refetch would put it back to pending and blank its spot
      // until the retry fails again. Remounting the page still retries it.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    })),
  });

  return (
    <div className="relative isolate flex h-full items-center justify-center overflow-hidden border bg-placeholder [container-type:size]">
      {/* The canvas, centered in the panel. It's never larger than the Figma, and shrinks to fit
          whichever of the panel's width or height runs out first. */}
      <div
        className="relative"
        style={{
          aspectRatio: `${CANVAS_SIZE.width} / ${CANVAS_SIZE.height}`,
          width: `min(${CANVAS_SIZE.width}px, 100cqw, 100cqh * ${CANVAS_SIZE.width} / ${CANVAS_SIZE.height})`,
        }}
      >
        <img
          src={silhouette}
          alt=""
          className="absolute object-cover opacity-[0.32]"
          style={{
            left: percentOfWidth(SILHOUETTE_BOX.left),
            top: percentOfHeight(SILHOUETTE_BOX.top),
            width: percentOfWidth(SILHOUETTE_BOX.width),
            height: percentOfHeight(SILHOUETTE_BOX.height),
          }}
        />
        {placedItems.map(({ spot, product, photoUrl }, index) => {
          const cutout = cutouts[index];

          // Drawn once the cut-out settles, so the uncut photo never flashes on the canvas.
          if (cutout.isPending) {
            return null;
          }

          // Usually the image host blocks cross-origin reads. multiply hides the photo's white
          // background, though the silhouette shows through the garment.
          if (cutout.isError) {
            return (
              <img
                key={product.id}
                src={photoUrl}
                alt={product.title}
                className="absolute max-w-none mix-blend-multiply"
                style={garmentPlacement(spot, WHOLE_PHOTO)}
              />
            );
          }

          return (
            <img
              key={product.id}
              src={cutout.data.url}
              alt={product.title}
              className="absolute max-w-none"
              style={garmentPlacement(spot, cutout.data.garment)}
            />
          );
        })}
      </div>
      {/* Help content comes with outfit editing. */}
      <Button label="Help" variant="secondary" disabled className="absolute left-sm top-md z-10" />
    </div>
  );
}
