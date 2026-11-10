import { X } from "@phosphor-icons/react";
import { useQueries } from "@tanstack/react-query";
import {
  useEffect,
  useEffectEvent,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

import silhouette from "@/design-system/assets/silhouette.png";
import { Box, Button } from "@/design-system";
import { cutOutGarment, type GarmentBox } from "@/features/outfits/garment-cutout";
import type { DraftItem } from "@/features/outfits/outfit-draft";
import { CANVAS_SIZE, placeOnCanvas, type CanvasSpot } from "@/features/outfits/outfit-items";

type OutfitCanvasProps = {
  items: DraftItem[];
  selectedOriginId: string | null;
  onSelect: (originId: string | null) => void;
  onRemove: (originId: string) => void;
  /** Drawn in the canvas's top-right corner. */
  controls: ReactNode;
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

function percent(fraction: number): string {
  return `${fraction * 100}%`;
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

/** The garment's box inside its photo, as a share of the photo's size. */
function garmentBox(garment: GarmentBox): CSSProperties {
  return {
    left: percent(garment.left),
    top: percent(garment.top),
    width: percent(garment.right - garment.left),
    height: percent(garment.bottom - garment.top),
  };
}

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

// The naming popup and the leave modal sit above the canvas, so their keys aren't for it.
function isInDialog(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest('[role="dialog"], [role="alertdialog"]') !== null
  );
}

export function OutfitCanvas({
  items,
  selectedOriginId,
  onSelect,
  onRemove,
  controls,
}: OutfitCanvasProps) {
  const originIdByProductId = new Map(items.map((item) => [item.product.id, item.originId]));
  const placedItems = placeOnCanvas(items.map((item) => item.product));

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

  const removeSelectedOnDelete = useEffectEvent((event: KeyboardEvent) => {
    if (selectedOriginId === null || isTextField(event.target) || isInDialog(event.target)) {
      return;
    }

    if (event.key !== "Delete" && event.key !== "Backspace") {
      return;
    }

    event.preventDefault();
    onRemove(selectedOriginId);
  });

  useEffect(() => {
    window.addEventListener("keydown", removeSelectedOnDelete);

    return () => window.removeEventListener("keydown", removeSelectedOnDelete);
  }, []);

  const drawnGarments = [];

  for (const [index, { spot, product, photoUrl }] of placedItems.entries()) {
    const cutout = cutouts[index];
    const originId = originIdByProductId.get(product.id);

    // Drawn once the cut-out settles, so the uncut photo never flashes on the canvas.
    if (cutout.isPending || originId === undefined) {
      continue;
    }

    drawnGarments.push({
      originId,
      product,
      spot,
      // Usually the image host blocks cross-origin reads, so the whole photo is the box.
      garment: cutout.isError ? WHOLE_PHOTO : cutout.data.garment,
      src: cutout.isError ? photoUrl : cutout.data.url,
      uncut: cutout.isError,
    });
  }

  const selectedGarment = drawnGarments.find((drawn) => drawn.originId === selectedOriginId);
  const topLayer = Math.max(...drawnGarments.map((drawn) => drawn.spot.layer));

  // Every control on the canvas is a button, so a click outside all of them is on empty canvas.
  function clearSelectionOnEmptyClick(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest("button") !== null) {
      return;
    }

    onSelect(null);
  }

  return (
    <Box
      onClick={clearSelectionOnEmptyClick}
      className="relative isolate flex h-full items-center justify-center overflow-hidden border bg-placeholder [container-type:size]"
    >
      {/* The canvas, centered in the panel. It's never larger than the Figma, and shrinks to fit
          whichever of the panel's width or height runs out first. */}
      <Box
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
        {drawnGarments.map(({ originId, product, spot, garment, src, uncut }) => (
          // Clicks pass through photos to the garment buttons, so a lower layer's garment stays
          // clickable under a higher layer's transparent edges. multiply hides an uncut photo's
          // white background; it goes on the wrapper because the wrapper's z-index would keep the
          // photo from blending with the canvas.
          <Box
            key={originId}
            className={`pointer-events-none absolute ${uncut ? "mix-blend-multiply" : ""}`}
            style={garmentPlacement(spot, garment)}
          >
            <img src={src} alt="" className="block w-full max-w-none" />
            <button
              type="button"
              aria-label={product.title}
              aria-pressed={originId === selectedOriginId}
              onClick={() => onSelect(originId)}
              className="pointer-events-auto absolute focus-ring"
              style={garmentBox(garment)}
            />
          </Box>
        ))}
        {selectedGarment !== undefined && (
          // Above every layer, so no garment covers the frame or the X, while the selected garment
          // keeps its place in the stack. The hidden photo gives the overlay the garment's size.
          <Box
            className="pointer-events-none absolute"
            style={{
              ...garmentPlacement(selectedGarment.spot, selectedGarment.garment),
              zIndex: topLayer + 1,
            }}
          >
            <img src={selectedGarment.src} alt="" className="invisible block w-full max-w-none" />
            <Box
              className="absolute border-thick border-dotted border-primary"
              style={garmentBox(selectedGarment.garment)}
            />
            <button
              type="button"
              aria-label={`Remove ${selectedGarment.product.title}`}
              onClick={() => onRemove(selectedGarment.originId)}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-error p-xxs text-inverse focus-ring"
              style={{
                left: percent(selectedGarment.garment.right),
                top: percent(selectedGarment.garment.top),
              }}
            >
              <X aria-hidden="true" weight="bold" />
            </button>
          </Box>
        )}
      </Box>
      {/* Help content comes with outfit editing. */}
      <Button label="Help" variant="secondary" disabled className="absolute left-sm top-md z-10" />
      <Box className="absolute right-sm top-md z-10">{controls}</Box>
    </Box>
  );
}
