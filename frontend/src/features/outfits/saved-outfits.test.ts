import { describe, expect, test } from "bun:test";

import type { InfiniteData } from "@tanstack/react-query";

import type {
  ListOutfitsResponse,
  OutfitResponse,
  PageOutfitResponse,
} from "@/api/generated/types.gen";
import {
  canFetchNextPage,
  isAlreadyDeleted,
  isEmptyList,
  nextFocusAfterDelete,
  piecesLine,
  withoutOutfit,
} from "@/features/outfits/saved-outfits";

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

describe("isAlreadyDeleted", () => {
  test("counts a 404 as already deleted", () => {
    expect(isAlreadyDeleted({ status: 404, title: "Not Found" })).toBe(true);
  });

  test("does not count any other status", () => {
    expect(isAlreadyDeleted({ status: 500 })).toBe(false);
    expect(isAlreadyDeleted({ status: 401 })).toBe(false);
    expect(isAlreadyDeleted({ status: 422 })).toBe(false);
  });

  test("does not count a failure that has no status, such as a dropped connection", () => {
    expect(isAlreadyDeleted({ detail: "Failed to fetch" })).toBe(false);
    expect(isAlreadyDeleted({})).toBe(false);
    expect(isAlreadyDeleted(null)).toBe(false);
    expect(isAlreadyDeleted(undefined)).toBe(false);
  });
});

describe("nextFocusAfterDelete", () => {
  const ids = ["a", "b", "c"];

  test("focuses the next card when one in the middle is deleted", () => {
    expect(nextFocusAfterDelete(ids, "b")).toBe("c");
  });

  test("focuses the second card when the first is deleted", () => {
    expect(nextFocusAfterDelete(ids, "a")).toBe("b");
  });

  test("focuses the list when the last card is deleted", () => {
    expect(nextFocusAfterDelete(ids, "c")).toBeNull();
  });

  test("focuses the list when the only card is deleted", () => {
    expect(nextFocusAfterDelete(["a"], "a")).toBeNull();
  });

  test("focuses the list, not the first card, when the outfit isn't in the list", () => {
    expect(nextFocusAfterDelete(ids, "gone")).toBeNull();
  });
});

describe("withoutOutfit", () => {
  function outfit(id: string): OutfitResponse {
    return {
      id,
      user_id: "user",
      name: id,
      description: "",
      tags: [],
      shared_at: null,
      created_at: "2026-11-14T10:00:00Z",
      updated_at: "2026-11-14T10:00:00Z",
      products: [],
    };
  }

  // A collection's pages have no total, and the saved outfits' pages do.
  function collectionPages(...pages: string[][]): InfiniteData<PageOutfitResponse> {
    return {
      pages: pages.map((ids, index) => ({
        items: ids.map(outfit),
        has_more: index < pages.length - 1,
        next_cursor: index < pages.length - 1 ? `cursor-${index}` : null,
      })),
      pageParams: pages.map((_, index) => (index === 0 ? {} : `cursor-${index - 1}`)),
    };
  }

  function savedPages(...pages: string[][]): InfiniteData<ListOutfitsResponse> {
    const total = pages.flat().length;

    return {
      ...collectionPages(...pages),
      pages: collectionPages(...pages).pages.map((page) => ({ ...page, total })),
    };
  }

  test("drops the outfit from the page it was on and leaves the others", () => {
    const result = withoutOutfit(collectionPages(["a", "b"], ["c", "d"]), "c");

    expect(result?.pages.map((page) => page.items.map((item) => item.id))).toEqual([
      ["a", "b"],
      ["d"],
    ]);
  });

  test("works on the saved outfits' pages too, and leaves their other fields as they were", () => {
    const result = withoutOutfit(savedPages(["a", "b"], ["c"]), "b");

    expect(result?.pages.map((page) => page.items.map((item) => item.id))).toEqual([["a"], ["c"]]);
    expect(result?.pages.map((page) => page.total)).toEqual([3, 3]);
  });

  test("keeps the paging details, so the next page is still the next page", () => {
    const data = collectionPages(["a"], ["b"]);
    const result = withoutOutfit(data, "a");

    expect(result?.pageParams).toEqual(data.pageParams);
    expect(result?.pages.map((page) => page.next_cursor)).toEqual(["cursor-0", null]);
  });

  test("leaves a page that is left with no outfits in place, so its cursor still works", () => {
    const result = withoutOutfit(collectionPages(["a"], ["b"]), "a");

    expect(result?.pages).toHaveLength(2);
    expect(result?.pages[0].items).toEqual([]);
  });

  test("returns the same data when the outfit isn't loaded", () => {
    const data = collectionPages(["a", "b"]);

    expect(withoutOutfit(data, "elsewhere")).toBe(data);
  });

  test("returns undefined when nothing is cached", () => {
    expect(withoutOutfit<PageOutfitResponse>(undefined, "a")).toBeUndefined();
  });
});
