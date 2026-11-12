import { useQueries } from "@tanstack/react-query";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

import silhouette from "@/design-system/assets/silhouette.png";
import { Box } from "@/design-system";
import { cutOutGarment, type GarmentBox } from "@/features/outfits/garment-cutout";
import {
  CANVAS_SIZE,
  placeOnCanvas,
  type CanvasSpot,
  type Product,
} from "@/features/outfits/outfit-items";

/** A garment whose cut-out has settled, with where it goes on the canvas. */
export type DrawnGarment = {
  product: Product;
  spot: CanvasSpot;
  garment: GarmentBox;
  src: string;
  uncut: boolean;
};

type GarmentImageProps = {
  drawn: DrawnGarment;
};

type CanvasStageProps = {
  /** Controls drawn over the panel, placed by the caller with absolute positioning. */
  controls: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  children: ReactNode;
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

export function percent(fraction: number): string {
  return `${fraction * 100}%`;
}

/**
 * Puts the garment, not the whole photo, on the spot. translate percentages are of the image's own
 * size, so this works without knowing the photo's height.
 */
export function garmentPlacement(spot: CanvasSpot, garment: GarmentBox): CSSProperties {
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

/** Places the products in the order given and cuts each photo out, leaving out unsettled ones. */
export function useDrawnGarments(products: Product[]): DrawnGarment[] {
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

  const drawnGarments: DrawnGarment[] = [];

  for (const [index, { spot, product, photoUrl }] of placedItems.entries()) {
    const cutout = cutouts[index];

    // Drawn once the cut-out settles, so the uncut photo never flashes on the canvas.
    if (cutout.isPending) {
      continue;
    }

    drawnGarments.push({
      product,
      spot,
      // Usually the image host blocks cross-origin reads, so the whole photo is the box.
      garment: cutout.isError ? WHOLE_PHOTO : cutout.data.garment,
      src: cutout.isError ? photoUrl : cutout.data.url,
      uncut: cutout.isError,
    });
  }

  return drawnGarments;
}

export function GarmentImage({ drawn }: GarmentImageProps) {
  return (
    <img
      src={drawn.src}
      alt={drawn.product.title}
      // multiply hides an uncut photo's white background, though the silhouette shows through.
      className={`absolute max-w-none ${drawn.uncut ? "mix-blend-multiply" : ""}`}
      style={garmentPlacement(drawn.spot, drawn.garment)}
    />
  );
}

/** The panel, with the silhouette and the garments in a canvas that keeps the Figma's proportions. */
export function CanvasStage({ controls, onClick, children }: CanvasStageProps) {
  return (
    <Box
      onClick={onClick}
      className="relative isolate flex h-full items-center justify-center overflow-hidden border bg-placeholder [container-type:size]"
    >
      {/* The canvas, centered in the panel. It's never larger than the Figma, and shrinks to fit
          whichever of the panel's width or height runs out first. isolate keeps the garments'
          z-indexes inside it, so controls drawn after it always land on top. */}
      <Box
        className="relative isolate"
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
        {children}
      </Box>
      {controls}
    </Box>
  );
}
