import { describe, expect, test } from "bun:test";

import { selectionReducer } from "@/features/outfits/editor-selection";

const nothing = { selectedOriginId: null, panel: null };

const onShirt = { selectedOriginId: "shirt", panel: { originId: "shirt" } };

const panelOnShirt = { selectedOriginId: null, panel: { originId: "shirt" } };

describe("select", () => {
  test("an item selects it and opens its spot in the panel", () => {
    expect(selectionReducer(nothing, { type: "select", originId: "shirt" })).toEqual(onShirt);
  });

  test("another item moves both", () => {
    const state = selectionReducer(onShirt, { type: "select", originId: "jeans" });

    expect(state).toEqual({ selectedOriginId: "jeans", panel: { originId: "jeans" } });
  });

  test("null clears the selection and the panel", () => {
    const state = selectionReducer(onShirt, { type: "select", originId: null });

    expect(state).toEqual(nothing);
  });

  test("null clears the panel left open by a swap", () => {
    const state = selectionReducer(panelOnShirt, { type: "select", originId: null });

    expect(state).toEqual(nothing);
  });
});

describe("openSlot", () => {
  test("opens the empty slot and clears the selection", () => {
    const state = selectionReducer(onShirt, { type: "openSlot", slot: "shoe" });

    expect(state).toEqual({ selectedOriginId: null, panel: { slot: "shoe" } });
  });
});

describe("afterSwap", () => {
  test("clears the selection and keeps the panel", () => {
    const state = selectionReducer(onShirt, { type: "afterSwap" });

    expect(state).toEqual(panelOnShirt);
  });
});

describe("afterAdd", () => {
  test("moves the panel from the slot onto the added spot", () => {
    const onShoeSlot = { selectedOriginId: null, panel: { slot: "shoe" as const } };

    const state = selectionReducer(onShoeSlot, { type: "afterAdd", originId: "boots" });

    expect(state).toEqual({ selectedOriginId: null, panel: { originId: "boots" } });
  });
});

describe("dropRemovedSpots", () => {
  test("clears both when the panel's spot is gone", () => {
    const state = selectionReducer(onShirt, {
      type: "dropRemovedSpots",
      remainingOriginIds: ["jeans"],
    });

    expect(state).toEqual(nothing);
  });

  test("clears both when the panel's spot is gone and nothing is selected", () => {
    const state = selectionReducer(panelOnShirt, {
      type: "dropRemovedSpots",
      remainingOriginIds: ["jeans"],
    });

    expect(state).toEqual(nothing);
  });

  test("keeps an empty slot open", () => {
    const onShoeSlot = { selectedOriginId: null, panel: { slot: "shoe" as const } };

    const state = selectionReducer(onShoeSlot, {
      type: "dropRemovedSpots",
      remainingOriginIds: [],
    });

    expect(state).toBe(onShoeSlot);
  });

  test("returns the same state while every spot remains", () => {
    const state = selectionReducer(onShirt, {
      type: "dropRemovedSpots",
      remainingOriginIds: ["shirt", "jeans"],
    });

    expect(state).toBe(onShirt);
  });
});
