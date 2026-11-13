import { XIcon } from "@phosphor-icons/react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

import { Box } from "@/design-system";
import type { GarmentBox } from "@/features/outfits/garment-cutout";
import {
  CanvasStage,
  GarmentImage,
  garmentPlacement,
  percent,
  useDrawnGarments,
  type DrawnGarment,
} from "@/features/outfits/outfit-canvas-stage";
import type { Product } from "@/features/outfits/outfit-items";

/** What the editor needs to select and remove garments. */
export type CanvasEditing = {
  /** The spot each product holds, so a selection follows the spot through a swap. */
  originIdByProductId: ReadonlyMap<string, string>;
  selectedOriginId: string | null;
  onSelect: (originId: string | null) => void;
  onRemove: (originId: string) => void;
};

type EditableOutfitCanvasProps = {
  products: Product[];
  editing: CanvasEditing;
  children: ReactNode;
};

type SelectableGarmentProps = {
  drawn: DrawnGarment;
  selected: boolean;
  onSelect: () => void;
};

type SelectionOverlayProps = {
  drawn: DrawnGarment;
  layer: number;
  onRemove: () => void;
};

/** The garment's box inside its photo, as a share of the photo's size. */
function garmentBox(garment: GarmentBox): CSSProperties {
  return {
    left: percent(garment.left),
    top: percent(garment.top),
    width: percent(garment.right - garment.left),
    height: percent(garment.bottom - garment.top),
  };
}

/** The outfit canvas with selectable garments, a frame and X on the selected one. */
export function EditableOutfitCanvas({ products, editing, children }: EditableOutfitCanvasProps) {
  const drawnGarments = useDrawnGarments(products);
  const { originIdByProductId, selectedOriginId } = editing;

  const selectedGarment =
    selectedOriginId === null
      ? undefined
      : drawnGarments.find(
          (drawn) => originIdByProductId.get(drawn.product.id) === selectedOriginId,
        );

  const topLayer = Math.max(...drawnGarments.map((drawn) => drawn.spot.layer));

  // Every control on the canvas is a button, so a click outside all of them is on empty canvas.
  function clearSelectionOnEmptyClick(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest("button") !== null) {
      return;
    }

    editing.onSelect(null);
  }

  return (
    <CanvasStage controls={children} onClick={clearSelectionOnEmptyClick}>
      {drawnGarments.map((drawn) => {
        const originId = originIdByProductId.get(drawn.product.id);

        if (originId === undefined) {
          return <GarmentImage key={drawn.product.id} drawn={drawn} />;
        }

        return (
          <SelectableGarment
            key={drawn.product.id}
            drawn={drawn}
            selected={originId === selectedOriginId}
            onSelect={() => editing.onSelect(originId)}
          />
        );
      })}
      {selectedOriginId !== null && selectedGarment !== undefined && (
        <SelectionOverlay
          drawn={selectedGarment}
          layer={topLayer + 1}
          onRemove={() => editing.onRemove(selectedOriginId)}
        />
      )}
    </CanvasStage>
  );
}

function SelectableGarment({ drawn, selected, onSelect }: SelectableGarmentProps) {
  // multiply hides an uncut photo's white background, though the silhouette shows through.
  const blend = drawn.uncut ? "mix-blend-multiply" : "";

  return (
    // Clicks pass through photos to the garment buttons, so a lower layer's garment stays
    // clickable under a higher layer's transparent edges. The blend goes on the wrapper
    // because the wrapper's z-index would keep the photo from blending with the canvas.
    <Box
      className={`pointer-events-none absolute ${blend}`}
      style={garmentPlacement(drawn.spot, drawn.garment)}
    >
      <img src={drawn.src} alt="" className="block w-full max-w-none" />
      <button
        type="button"
        aria-label={drawn.product.title}
        aria-pressed={selected}
        onClick={onSelect}
        className="pointer-events-auto absolute focus-ring"
        style={garmentBox(drawn.garment)}
      />
    </Box>
  );
}

function SelectionOverlay({ drawn, layer, onRemove }: SelectionOverlayProps) {
  return (
    // Above every layer, so no garment covers the frame or the X, while the selected garment
    // keeps its place in the stack. The hidden photo gives the overlay the garment's size.
    <Box
      className="pointer-events-none absolute"
      style={{ ...garmentPlacement(drawn.spot, drawn.garment), zIndex: layer }}
    >
      <img src={drawn.src} alt="" className="invisible block w-full max-w-none" />
      <Box
        className="absolute border-thick border-dotted border-primary"
        style={garmentBox(drawn.garment)}
      />
      <button
        type="button"
        aria-label={`Remove ${drawn.product.title}`}
        onClick={onRemove}
        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-error p-xxs text-inverse focus-ring"
        style={{ left: percent(drawn.garment.right), top: percent(drawn.garment.top) }}
      >
        <XIcon aria-hidden="true" weight="bold" />
      </button>
    </Box>
  );
}
