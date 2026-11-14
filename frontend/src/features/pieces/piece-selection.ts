import type { BirdieAndClaireProductResponse } from "@/api/generated/types.gen";
import { zUpdateOwnedProductsInputBody } from "@/api/generated/zod.gen";

/** The shopper's unsaved changes in the piece picker: catalog pieces newly picked, and owned pieces
 * unpicked. */
export type PieceSelection = {
  added: BirdieAndClaireProductResponse[];
  removedIds: string[];
};

export const noChanges: PieceSelection = { added: [], removedIds: [] };

export function isPicked(selection: PieceSelection, product: BirdieAndClaireProductResponse) {
  if (product.owned) {
    return !selection.removedIds.includes(product.id);
  }

  return selection.added.some((picked) => picked.id === product.id);
}

/** Returns the selection with product picked or unpicked. */
export function withPicked(
  selection: PieceSelection,
  product: BirdieAndClaireProductResponse,
  picked: boolean,
): PieceSelection {
  if (product.owned) {
    const removedIds = selection.removedIds.filter((id) => id !== product.id);

    return { ...selection, removedIds: picked ? removedIds : [...removedIds, product.id] };
  }

  const added = selection.added.filter((addedPiece) => addedPiece.id !== product.id);

  return { ...selection, added: picked ? [...added, product] : added };
}

export function hasChanges(selection: PieceSelection) {
  return selection.added.length > 0 || selection.removedIds.length > 0;
}

/** How many pieces are picked, given how many owned pieces the catalog shows. Only those can be
 * unpicked, so every removed id is one of them. */
export function pickedCount(selection: PieceSelection, ownedTotal: number) {
  return ownedTotal - selection.removedIds.length + selection.added.length;
}

/** The picked pieces among the owned pieces loaded so far, then the added ones. */
export function pickedPieces(
  selection: PieceSelection,
  ownedPieces: BirdieAndClaireProductResponse[],
) {
  return [
    ...ownedPieces.filter((piece) => !selection.removedIds.includes(piece.id)),
    ...selection.added,
  ];
}

/** Asks the save endpoint's own schema whether one more new piece still fits in a request. The
 * extra id's value doesn't matter: only the count can fail. */
export function isAtAddLimit(selection: PieceSelection) {
  return !zUpdateOwnedProductsInputBody.shape.add_product_ids.safeParse([
    ...selection.added.map((product) => product.id),
    "",
  ]).success;
}
