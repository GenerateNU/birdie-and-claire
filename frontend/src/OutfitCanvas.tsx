import { useQueries } from "@tanstack/react-query";
import type { CSSProperties } from "react";

import helpIcon from "./assets/icons/help.svg";
import silhouette from "./assets/silhouette.png";
import { cutOutGarment, type GarmentBox } from "./garmentCutout";
import {
  CANVAS_SIZE,
  CANVAS_SPOTS,
  spotFor,
  type CanvasSpot,
  type OutfitItem,
} from "./outfitItems";

type OutfitCanvasProps = {
  items: OutfitItem[];
};

// Where the Figma draws silhouette.png, in canvas pixels.
const SILHOUETTE_BOX = { left: 241, top: -6, width: 446, height: 792 };

// For a photo that couldn't be cut out, the garment's box is unknown.
const WHOLE_PHOTO: GarmentBox = { left: 0, top: 0, right: 1, bottom: 1 };

// Percentages of the canvas, so the layout scales with the page and keeps the Figma's proportions.
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

export default function OutfitCanvas({ items }: OutfitCanvasProps) {
  // One item per spot: the first by title that has a photo, whether or not it has loaded yet, so
  // the pick doesn't change with load timing. Others show only in the details list.
  const itemsByTitle = [...items].sort((a, b) => a.product.title.localeCompare(b.product.title));

  const placedItems = CANVAS_SPOTS.flatMap((spot) => {
    const item = itemsByTitle.find(
      (candidate) =>
        spotFor(candidate.product.product_type) === spot &&
        candidate.image.status !== "missing" &&
        candidate.image.status !== "failed",
    );

    // Nothing for this spot, or its photo hasn't loaded yet.
    if (item?.image.status !== "loaded") {
      return [];
    }

    return [{ spot, product: item.product, photoUrl: item.image.url }];
  });

  const cutouts = useQueries({
    queries: placedItems.map(({ photoUrl }) => ({
      queryKey: ["garment-cutout", photoUrl],
      // Null when the photo can't be cut out. A query that rejects has no data, so it counts as
      // stale and goes back to pending on every window focus, which blanks its spot. A host that
      // blocks cross-origin reads won't allow them on a later try either.
      queryFn: () => cutOutGarment(photoUrl).catch(() => null),
      // A cut-out depends only on its photo.
      staleTime: Infinity,
    })),
  });

  return (
    <div
      className="relative isolate overflow-hidden border border-black bg-[#eaeaea]"
      style={{ aspectRatio: `${CANVAS_SIZE.width} / ${CANVAS_SIZE.height}` }}
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
        const cutout = cutouts[index].data;

        // Drawn once the cut-out settles, so the uncut photo never flashes on the canvas.
        if (cutout === undefined) {
          return null;
        }

        // Usually the image host blocks cross-origin reads. multiply hides the photo's white
        // background, though the silhouette shows through the garment.
        if (cutout === null) {
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
            src={cutout.url}
            alt={product.title}
            className="absolute max-w-none"
            style={garmentPlacement(spot, cutout.garment)}
          />
        );
      })}
      {/* Help content comes with outfit editing. */}
      <button
        type="button"
        disabled
        aria-label="Help"
        className="absolute left-[12px] top-[15px] z-10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <img src={helpIcon} alt="" width={43} height={43} />
      </button>
    </div>
  );
}
