import type { QueryClient } from "@tanstack/react-query";

import { listBirdieAndClaireProductsInfiniteQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import type {
  ListBirdieAndClaireProductsData,
  ListCurrentUserPiecesData,
} from "@/api/generated/types.gen";

type CatalogFilter = Omit<ListBirdieAndClaireProductsData["query"], "limit" | "cursor">;

type CatalogTabParam = "slot" | "product_type" | "exclude_product_type";

/** What a tab picks by. It filters My Pieces too, so it is checked against both lists' params, and a
 * param either list drops or renames fails the build. */
export type CatalogTabFilter = Pick<CatalogFilter, CatalogTabParam> &
  Pick<NonNullable<ListCurrentUserPiecesData["query"]>, CatalogTabParam>;

type CatalogTab = {
  label: string;
  value: string;
  filter: CatalogTabFilter;
};

// Shopify's product type for sweaters, which sit in the top slot with every other top.
const sweaterProductType = "Sweaters";

/** The Add Items tabs from Figma, plus Shoes, which Figma leaves out. A dress sits under Jumpsuits. */
export const catalogTabs: CatalogTab[] = [
  {
    label: "Tops",
    value: "tops",
    filter: { slot: ["top"], exclude_product_type: sweaterProductType },
  },
  {
    label: "Sweaters",
    value: "sweaters",
    filter: { slot: ["top"], product_type: sweaterProductType },
  },
  { label: "Bottoms", value: "bottoms", filter: { slot: ["bottom"] } },
  { label: "Jumpsuits", value: "jumpsuits", filter: { slot: ["one_piece"] } },
  { label: "Accessories", value: "accessories", filter: { slot: ["accessory"] } },
  { label: "Shoes", value: "shoes", filter: { slot: ["shoe"] } },
];

/** The owned pieces some tab shows, for the Selected Items count and panel. */
export const ownedCatalogFilter: CatalogFilter = {
  slot: [...new Set(catalogTabs.flatMap((tab) => tab.filter.slot))],
  owned_only: true,
};

/** Refetches every tab and the owned list. Both mark owned pieces, so adding or removing one changes
 * them. */
export function invalidateBirdieAndClaireCatalog(queryClient: QueryClient) {
  const filters = [...catalogTabs.map((tab) => tab.filter), ownedCatalogFilter];

  return Promise.all(
    filters.map((filter) =>
      queryClient.invalidateQueries({
        // Matches the list's pages whatever their limit, since TanStack compares keys as a subset.
        queryKey: listBirdieAndClaireProductsInfiniteQueryKey({ query: filter }),
      }),
    ),
  );
}
