import { describe, expect, test } from "bun:test";

import { draftReducer, hasSameProducts, initialDraft } from "@/features/outfits/outfit-draft";
import type { Product } from "@/features/outfits/outfit-items";

function product(id: string, title: string): Product {
  return { id, title, slot: "top", image_url: null };
}

const shirt = product("shirt", "Shirt");

const jeans = product("jeans", "Jeans");

const boots = product("boots", "Boots");

const sweater = product("sweater", "Sweater");

function productIds(state: ReturnType<typeof initialDraft>) {
  return state.items.map((item) => item.product.id);
}

describe("initialDraft", () => {
  test("sorts by title and gives each item its own id as origin", () => {
    const state = initialDraft([shirt, jeans, boots]);

    expect(productIds(state)).toEqual(["boots", "jeans", "shirt"]);
    expect(state.items.map((item) => item.originId)).toEqual(["boots", "jeans", "shirt"]);
  });
});

describe("swap", () => {
  test("replaces the item in its spot and keeps its origin", () => {
    const state = draftReducer(initialDraft([shirt, jeans]), {
      type: "swap",
      originId: "shirt",
      product: sweater,
    });

    expect(state.items[1]).toEqual({ product: sweater, originId: "shirt" });
    expect(productIds(state)).toEqual(["jeans", "sweater"]);
  });

  test("keeps the origin across a second swap of the same spot", () => {
    const once = draftReducer(initialDraft([shirt, jeans]), {
      type: "swap",
      originId: "shirt",
      product: sweater,
    });

    const twice = draftReducer(once, { type: "swap", originId: "shirt", product: boots });

    expect(twice.items[1]).toEqual({ product: boots, originId: "shirt" });
  });

  test("ignores a product that is already in the draft", () => {
    const start = initialDraft([shirt, jeans]);

    expect(draftReducer(start, { type: "swap", originId: "shirt", product: jeans })).toBe(start);
    expect(draftReducer(start, { type: "swap", originId: "shirt", product: shirt })).toBe(start);
  });
});

describe("remove", () => {
  test("drops the item", () => {
    const state = draftReducer(initialDraft([shirt, jeans]), { type: "remove", originId: "jeans" });

    expect(productIds(state)).toEqual(["shirt"]);
  });

  test("keeps the last item", () => {
    const start = initialDraft([shirt]);

    expect(draftReducer(start, { type: "remove", originId: "shirt" })).toBe(start);
  });
});

describe("undo and redo", () => {
  test("step back and forward through edits", () => {
    const start = initialDraft([shirt, jeans]);
    const swapped = draftReducer(start, { type: "swap", originId: "shirt", product: sweater });
    const removed = draftReducer(swapped, { type: "remove", originId: "jeans" });

    const undoneOnce = draftReducer(removed, { type: "undo" });
    const undoneTwice = draftReducer(undoneOnce, { type: "undo" });
    const redone = draftReducer(undoneTwice, { type: "redo" });

    expect(undoneOnce.items).toEqual(swapped.items);
    expect(undoneTwice.items).toEqual(start.items);
    expect(undoneTwice.past).toEqual([]);
    expect(redone.items).toEqual(swapped.items);
  });

  test("a new edit clears the future", () => {
    const swapped = draftReducer(initialDraft([shirt, jeans]), {
      type: "swap",
      originId: "shirt",
      product: sweater,
    });

    const undone = draftReducer(swapped, { type: "undo" });
    const removed = draftReducer(undone, { type: "remove", originId: "jeans" });

    expect(removed.future).toEqual([]);
  });

  test("do nothing with an empty history", () => {
    const start = initialDraft([shirt]);

    expect(draftReducer(start, { type: "undo" })).toBe(start);
    expect(draftReducer(start, { type: "redo" })).toBe(start);
  });
});

describe("reset", () => {
  test("takes the new baseline and clears history", () => {
    const swapped = draftReducer(initialDraft([shirt, jeans]), {
      type: "swap",
      originId: "shirt",
      product: sweater,
    });

    const reset = draftReducer(swapped, { type: "reset", baseline: [sweater, jeans] });

    expect(productIds(reset)).toEqual(["jeans", "sweater"]);
    expect(reset.past).toEqual([]);
    expect(reset.future).toEqual([]);
  });
});

describe("hasSameProducts", () => {
  test("is false after a swap and true after swapping back", () => {
    const start = initialDraft([shirt, jeans]);
    const swapped = draftReducer(start, { type: "swap", originId: "shirt", product: sweater });
    const undone = draftReducer(swapped, { type: "undo" });

    expect(hasSameProducts(swapped.items, start.baseline)).toBe(false);
    expect(hasSameProducts(undone.items, start.baseline)).toBe(true);
  });

  test("is false when the draft has fewer items than the baseline", () => {
    const fewer = initialDraft([shirt]).items;

    expect(hasSameProducts(fewer, [shirt, jeans])).toBe(false);
  });

  test("is false after a remove", () => {
    const start = initialDraft([shirt, jeans]);
    const removed = draftReducer(start, { type: "remove", originId: "jeans" });

    expect(hasSameProducts(removed.items, start.baseline)).toBe(false);
  });

  test("ignores order", () => {
    const reordered = [...initialDraft([shirt, jeans]).items].reverse();

    expect(hasSameProducts(reordered, [shirt, jeans])).toBe(true);
  });
});
