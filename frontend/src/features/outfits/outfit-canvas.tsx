import type { ReactNode } from "react";

import { EditableOutfitCanvas, type CanvasEditing } from "@/features/outfits/outfit-canvas-editing";
import {
  CanvasStage,
  GarmentImage,
  useDrawnGarments,
  type CanvasVariant,
} from "@/features/outfits/outfit-canvas-stage";
import type { Product } from "@/features/outfits/outfit-items";

type OutfitCanvasProps =
  | {
      products: Product[];
      editing: CanvasEditing;
      /** Controls drawn over the panel, placed by the caller with absolute positioning. */
      children: ReactNode;
    }
  | { products: Product[]; editing?: undefined; variant: CanvasVariant; children?: never };

type ReadOnlyOutfitCanvasProps = {
  products: Product[];
  variant: CanvasVariant;
};

export function OutfitCanvas(props: OutfitCanvasProps) {
  if (props.editing !== undefined) {
    return (
      <EditableOutfitCanvas products={props.products} editing={props.editing}>
        {props.children}
      </EditableOutfitCanvas>
    );
  }

  return <ReadOnlyOutfitCanvas products={props.products} variant={props.variant} />;
}

function ReadOnlyOutfitCanvas({ products, variant }: ReadOnlyOutfitCanvasProps) {
  const drawnGarments = useDrawnGarments(products);

  return (
    <CanvasStage controls={null} variant={variant}>
      {drawnGarments.map((drawn) => (
        <GarmentImage key={drawn.product.id} drawn={drawn} />
      ))}
    </CanvasStage>
  );
}
