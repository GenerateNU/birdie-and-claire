import { describe, expect, test } from "bun:test";

import { canFetchNextPage, isEmptyList, piecesLine } from "@/features/outfits/saved-outfits";

describe("piecesLine", () => {
  test("joins titles with a comma, in order, keeping their case", () => {
    const products = [
      { title: "Houndstooth blazer" },
      { title: "black trousers" },
      { title: "Beret" },
    ];

    expect(piecesLine(products)).toBe("Houndstooth blazer, black trousers, Beret");
  });

  test("is an empty string for an outfit with no products", () => {
    expect(piecesLine([])).toBe("");
  });
});

describe("isEmptyList", () => {
  test("is empty when nothing loaded and no page is left", () => {
    expect(isEmptyList(0, false)).toBe(true);
  });

  test("is loading, not empty, when an empty first page has more to come", () => {
    expect(isEmptyList(0, true)).toBe(false);
  });

  test("is not empty once anything has loaded", () => {
    expect(isEmptyList(1, false)).toBe(false);
    expect(isEmptyList(12, true)).toBe(false);
  });
});

describe("canFetchNextPage", () => {
  test("asks for another page when none is loading and the last request succeeded", () => {
    expect(canFetchNextPage({ isFetchingNextPage: false, isFetchNextPageError: false })).toBe(true);
  });

  test("waits while a page is loading", () => {
    expect(canFetchNextPage({ isFetchingNextPage: true, isFetchNextPageError: false })).toBe(false);
  });

  test("waits for the retry button after a failed request", () => {
    expect(canFetchNextPage({ isFetchingNextPage: false, isFetchNextPageError: true })).toBe(false);
  });
});
