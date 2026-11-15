import type { InfiniteData } from "@tanstack/react-query";

import type { ErrorModel, ProductResponse } from "@/api/generated/types.gen";

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

/**
 * Whether a failed delete means the outfit is already gone: the API answers 404 for an outfit that
 * is missing or isn't the user's. The user asked for it to be gone, so that counts as success.
 */
export function isAlreadyDeleted(error: ErrorModel | null | undefined): boolean {
  return error?.status === 404;
}

/**
 * The outfit whose card takes focus once `deletedId` leaves the list: the next one, or null when
 * it was the last, which sends focus to the list itself.
 */
export function nextFocusAfterDelete(outfitIds: string[], deletedId: string): string | null {
  const index = outfitIds.indexOf(deletedId);

  if (index === -1) {
    return null;
  }

  return outfitIds[index + 1] ?? null;
}

/**
 * The loaded pages without `outfitId`, so a list can drop a deleted outfit before its refreshed pages
 * arrive. It takes the saved outfits' pages and a collection's alike. Pages that never had it come
 * back unchanged, and everything else on a page, such as its cursor, is left alone.
 */
export function withoutOutfit<TPage extends { items: { id: string }[] }>(
  data: InfiniteData<TPage> | undefined,
  outfitId: string,
): InfiniteData<TPage> | undefined {
  if (!data?.pages.some((page) => page.items.some((outfit) => outfit.id === outfitId))) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((outfit) => outfit.id !== outfitId),
    })),
  };
}
