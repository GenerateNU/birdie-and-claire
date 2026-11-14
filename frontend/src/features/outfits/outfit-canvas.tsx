import type { ReactNode } from "react";

import { EditableOutfitCanvas, type CanvasEditing } from "@/features/outfits/outfit-canvas-editing";
import {
  CanvasStage,
  GarmentImage,
  useDrawnGarments,
} from "@/features/outfits/outfit-canvas-stage";
import type { Product } from "@/features/outfits/outfit-items";

type OutfitCanvasProps =
  | {
      products: Product[];
      editing: CanvasEditing;
      /** Controls drawn over the panel, placed by the caller with absolute positioning. */
      children: ReactNode;
    }
  | { products: Product[]; editing?: undefined; children?: never };

type ReadOnlyOutfitCanvasProps = {
  products: Product[];
};

export function OutfitCanvas({ products, editing, children }: OutfitCanvasProps) {
  if (editing !== undefined) {
    return (
      <EditableOutfitCanvas products={products} editing={editing}>
        {children}
      </EditableOutfitCanvas>
    );
  }

  return <ReadOnlyOutfitCanvas products={products} />;
}

function ReadOnlyOutfitCanvas({ products }: ReadOnlyOutfitCanvasProps) {
  const drawnGarments = useDrawnGarments(products);

  return (
    <CanvasStage controls={null}>
      {drawnGarments.map((drawn) => (
        <GarmentImage key={drawn.product.id} drawn={drawn} />
      ))}
    </CanvasStage>
  );
}
