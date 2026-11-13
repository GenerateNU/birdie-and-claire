import type { ReactNode } from "react";

import { EditableOutfitCanvas, type CanvasEditing } from "@/features/outfits/outfit-canvas-editing";
import {
  CanvasStage,
  GarmentImage,
  useDrawnGarments,
} from "@/features/outfits/outfit-canvas-stage";
import type { Product } from "@/features/outfits/outfit-items";

type OutfitCanvasProps = {
  products: Product[];
  editing?: CanvasEditing;
  /** Controls drawn over the panel, placed by the caller with absolute positioning. */
  children: ReactNode;
};

type ReadOnlyOutfitCanvasProps = Omit<OutfitCanvasProps, "editing">;

export function OutfitCanvas({ products, editing, children }: OutfitCanvasProps) {
  if (editing !== undefined) {
    return (
      <EditableOutfitCanvas products={products} editing={editing}>
        {children}
      </EditableOutfitCanvas>
    );
  }

  return <ReadOnlyOutfitCanvas products={products}>{children}</ReadOnlyOutfitCanvas>;
}

function ReadOnlyOutfitCanvas({ products, children }: ReadOnlyOutfitCanvasProps) {
  const drawnGarments = useDrawnGarments(products);

  return (
    <CanvasStage controls={children}>
      {drawnGarments.map((drawn) => (
        <GarmentImage key={drawn.product.id} drawn={drawn} />
      ))}
    </CanvasStage>
  );
}
