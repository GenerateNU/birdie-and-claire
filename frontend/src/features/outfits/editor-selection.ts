import { useReducer } from "react";

import type { DraftItem } from "@/features/outfits/outfit-draft";
import type { Product } from "@/features/outfits/outfit-items";

/** What the side panel edits: a spot in the draft, or an empty slot to fill. */
export type PanelTarget = { originId: string } | { slot: Product["slot"] };

type SelectionState = {
  selectedOriginId: string | null;
  panel: PanelTarget | null;
};

type SelectionAction =
  | { type: "select"; originId: string | null }
  | { type: "openSlot"; slot: Product["slot"] }
  | { type: "afterSwap" }
  | { type: "afterAdd"; originId: string }
  | { type: "dropRemovedSpots"; remainingOriginIds: string[] };

const noSelection: SelectionState = { selectedOriginId: null, panel: null };

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "select":
      if (action.originId === null) {
        return noSelection;
      }

      return { selectedOriginId: action.originId, panel: { originId: action.originId } };

    case "openSlot":
      return { selectedOriginId: null, panel: { slot: action.slot } };

    case "afterSwap":
      return { ...state, selectedOriginId: null };

    // The added product is its spot's original, so the panel moves onto that spot and the next
    // pick swaps it instead of adding another.
    case "afterAdd":
      return { selectedOriginId: null, panel: { originId: action.originId } };

    case "dropRemovedSpots": {
      const panelGone =
        state.panel !== null &&
        "originId" in state.panel &&
        !action.remainingOriginIds.includes(state.panel.originId);

      if (panelGone) {
        return noSelection;
      }

      return state;
    }
  }
}

/**
 * Which canvas item is selected, and what the side panel edits. The panel outlives the selection
 * after a swap or an add, so the user can keep picking for that spot.
 */
export function useEditorSelection(items: DraftItem[]) {
  const [state, dispatch] = useReducer(selectionReducer, noSelection);
  const remainingOriginIds = items.map((item) => item.original.id);
  const pruned = selectionReducer(state, { type: "dropRemovedSpots", remainingOriginIds });

  // A removed spot leaves nothing to select or edit. Dispatching during render applies it before
  // anything stale paints.
  if (pruned !== state) {
    dispatch({ type: "dropRemovedSpots", remainingOriginIds });
  }

  return {
    selectedOriginId: pruned.selectedOriginId,
    panel: pruned.panel,
    select: (originId: string | null) => dispatch({ type: "select", originId }),
    openSlot: (slot: Product["slot"]) => dispatch({ type: "openSlot", slot }),
    afterSwap: () => dispatch({ type: "afterSwap" }),
    afterAdd: (originId: string) => dispatch({ type: "afterAdd", originId }),
  };
}
