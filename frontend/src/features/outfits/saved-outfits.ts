import type { ProductResponse } from "@/api/generated/types.gen";

/** An outfit's product titles for its card's subtitle, in the order the API lists them. */
export function piecesLine(products: Pick<ProductResponse, "title">[]): string {
  return products.map((product) => product.title).join(", ");
}

/**
 * Whether to show the empty state: nothing has loaded and no page is left to load. A first page
 * can come back empty while more follow, and that is still loading, not empty.
 */
export function isEmptyList(loadedCount: number, hasMore: boolean): boolean {
  return loadedCount === 0 && !hasMore;
}

/**
 * Whether to request the next page now. The observer fires again whenever the list rebuilds, so a
 * failed request would retry in a loop if this didn't wait for the retry button.
 */
export function canFetchNextPage(request: {
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
}): boolean {
  return !request.isFetchingNextPage && !request.isFetchNextPageError;
}
