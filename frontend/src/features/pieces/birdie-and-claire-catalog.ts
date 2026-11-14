import type { QueryClient } from "@tanstack/react-query";

import { listBirdieAndClaireProductsInfiniteQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import { zListBirdieAndClaireProductsQuery } from "@/api/generated/zod.gen";

/** The Add Items tabs, in the order the API lists them. */
export const catalogCategories = zListBirdieAndClaireProductsQuery.shape.category.options;

export type CatalogCategory = (typeof catalogCategories)[number];

/** Refetches every tab of the catalog. It leaves owned pieces out, so adding or removing one changes it. */
export function invalidateBirdieAndClaireCatalog(queryClient: QueryClient) {
  return Promise.all(
    catalogCategories.map((category) =>
      queryClient.invalidateQueries({
        // Matches the tab's pages whatever their limit, since TanStack compares keys as a subset.
        queryKey: listBirdieAndClaireProductsInfiniteQueryKey({ query: { category } }),
      }),
    ),
  );
}
