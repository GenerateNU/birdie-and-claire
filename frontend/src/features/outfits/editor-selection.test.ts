import { describe, expect, test } from "bun:test";

import { selectionReducer } from "@/features/outfits/editor-selection";

const nothing = { selectedOriginId: null, panelOriginId: null };

const onShirt = { selectedOriginId: "shirt", panelOriginId: "shirt" };

describe("select", () => {
  test("an item selects it and opens its spot in the panel", () => {
    expect(selectionReducer(nothing, { type: "select", originId: "shirt" })).toEqual(onShirt);
  });

  test("another item moves both", () => {
    const state = selectionReducer(onShirt, { type: "select", originId: "jeans" });

    expect(state).toEqual({ selectedOriginId: "jeans", panelOriginId: "jeans" });
  });

  test("null clears the selection and the panel", () => {
    const state = selectionReducer(onShirt, { type: "select", originId: null });

    expect(state).toEqual(nothing);
  });

  test("null clears the panel left open by a swap", () => {
    const panelOnly = { selectedOriginId: null, panelOriginId: "shirt" };
    const state = selectionReducer(panelOnly, { type: "select", originId: null });

    expect(state).toEqual(nothing);
  });
});

describe("afterSwap", () => {
  test("clears the selection and keeps the panel", () => {
    const state = selectionReducer(onShirt, { type: "afterSwap" });

    expect(state).toEqual({ selectedOriginId: null, panelOriginId: "shirt" });
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
    const panelOnly = { selectedOriginId: null, panelOriginId: "shirt" };

    const state = selectionReducer(panelOnly, {
      type: "dropRemovedSpots",
      remainingOriginIds: ["jeans"],
    });

    expect(state).toEqual(nothing);
  });

  test("returns the same state while every spot remains", () => {
    const state = selectionReducer(onShirt, {
      type: "dropRemovedSpots",
      remainingOriginIds: ["shirt", "jeans"],
    });

    expect(state).toBe(onShirt);
  });
});
