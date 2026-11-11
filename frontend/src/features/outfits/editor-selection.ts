import { useReducer } from "react";

import type { DraftItem } from "@/features/outfits/outfit-draft";

type SelectionState = {
  selectedOriginId: string | null;
  panelOriginId: string | null;
};

type SelectionAction =
  | { type: "select"; originId: string | null }
  | { type: "afterSwap" }
  | { type: "keepSpots"; originIds: string[] };

const noSelection: SelectionState = { selectedOriginId: null, panelOriginId: null };

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "select":
      if (action.originId === null) {
        return noSelection;
      }

      return { selectedOriginId: action.originId, panelOriginId: action.originId };

    case "afterSwap":
      return { ...state, selectedOriginId: null };

    case "keepSpots": {
      const panelGone =
        state.panelOriginId !== null && !action.originIds.includes(state.panelOriginId);

      const selectionGone =
        state.selectedOriginId !== null && !action.originIds.includes(state.selectedOriginId);

      if (panelGone) {
        return noSelection;
      }

      if (selectionGone) {
        return { ...state, selectedOriginId: null };
      }

      return state;
    }
  }
}

/**
 * Which canvas item is selected, and which spot the swap panel edits. The panel outlives the
 * selection only after a swap, so the user can keep picking from that spot's suggestions.
 */
export function useEditorSelection(items: DraftItem[]) {
  const [state, dispatch] = useReducer(selectionReducer, noSelection);
  const originIds = items.map((item) => item.originId);
  const pruned = selectionReducer(state, { type: "keepSpots", originIds });

  // A removed spot leaves nothing to select or edit. Dispatching during render applies it before
  // anything stale paints.
  if (pruned !== state) {
    dispatch({ type: "keepSpots", originIds });
  }

  return {
    selectedOriginId: pruned.selectedOriginId,
    panelOriginId: pruned.panelOriginId,
    select: (originId: string | null) => dispatch({ type: "select", originId }),
    afterSwap: () => dispatch({ type: "afterSwap" }),
  };
}
