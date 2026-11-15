import { useReducer } from "react";

import type { Product } from "@/features/outfits/outfit-items";

/**
 * A product in the draft. `original` is the product that first held its spot, when the editor
 * loaded or when the spot was added; its id identifies the spot through swaps.
 */
export type DraftItem = { product: Product; original: Product };

type DraftState = {
  baseline: Product[];
  items: DraftItem[];
  past: DraftItem[][];
  future: DraftItem[][];
};

type DraftAction =
  | { type: "add"; product: Product }
  | { type: "swap"; originId: string; product: Product }
  | { type: "remove"; originId: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; baseline: Product[] };

export function initialDraft(baseline: Product[]): DraftState {
  const items = baseline.map((product) => ({ product, original: product }));

  return { baseline, items, past: [], future: [] };
}

function edit(state: DraftState, items: DraftItem[]): DraftState {
  return { ...state, items, past: [...state.past, state.items], future: [] };
}

// A one-piece takes the place of a top and a bottom, so adding either side clears the other.
function clashes(added: Product["slot"], existing: Product["slot"]) {
  if (added === "one_piece") {
    return existing === "top" || existing === "bottom";
  }

  return existing === "one_piece" && (added === "top" || added === "bottom");
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "add": {
      if (state.items.some((item) => item.product.id === action.product.id)) {
        return state;
      }

      const kept = state.items.filter((item) => !clashes(action.product.slot, item.product.slot));

      return edit(state, [...kept, { product: action.product, original: action.product }]);
    }

    case "swap": {
      const index = state.items.findIndex((item) => item.original.id === action.originId);
      const alreadyInDraft = state.items.some((item) => item.product.id === action.product.id);

      if (index === -1 || alreadyInDraft) {
        return state;
      }

      const items = state.items.map((item, itemIndex) =>
        itemIndex === index ? { product: action.product, original: item.original } : item,
      );

      return edit(state, items);
    }

    case "remove": {
      const items = state.items.filter((item) => item.original.id !== action.originId);

      if (items.length === state.items.length) {
        return state;
      }

      return edit(state, items);
    }

    case "undo": {
      const previous = state.past.at(-1);

      if (previous === undefined) {
        return state;
      }

      return {
        ...state,
        items: previous,
        past: state.past.slice(0, -1),
        future: [state.items, ...state.future],
      };
    }

    case "redo": {
      const [next, ...future] = state.future;

      if (next === undefined) {
        return state;
      }

      return { ...state, items: next, past: [...state.past, state.items], future };
    }

    case "reset":
      return initialDraft(action.baseline);
  }
}

export function hasSameProducts(items: DraftItem[], baseline: Product[]) {
  const baselineIds = new Set(baseline.map((product) => product.id));

  return (
    items.length === baselineIds.size && items.every((item) => baselineIds.has(item.product.id))
  );
}

/**
 * Holds the unsaved edits to an outfit, with undo and redo. Starts over from `saved` whenever its
 * products change, which happens when a save replaces the cached outfit.
 */
export function useOutfitDraft(saved: { products: Product[] }) {
  const [state, dispatch] = useReducer(draftReducer, saved.products, initialDraft);

  // Compared by reference: the query cache hands back the same array until the outfit changes.
  // Dispatching during render restarts it with the reset state, before anything stale paints.
  if (state.baseline !== saved.products) {
    dispatch({ type: "reset", baseline: saved.products });
  }

  return {
    items: state.items,
    add: (product: Product) => dispatch({ type: "add", product }),
    swap: (originId: string, product: Product) => dispatch({ type: "swap", originId, product }),
    remove: (originId: string) => dispatch({ type: "remove", originId }),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    isDirty: !hasSameProducts(state.items, state.baseline),
  };
}
