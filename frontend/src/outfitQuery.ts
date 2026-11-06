import { queryOptions } from "@tanstack/react-query";

import type { Outfit } from "@/OutfitList";
import { apiFetch } from "@/api";
import type { Product } from "@/outfitItems";

export type OutfitResponse = Outfit & {
  products: Product[];
};

async function fetchOutfit(outfitId: string, signal: AbortSignal): Promise<OutfitResponse | null> {
  const response = await apiFetch(`/api/v1/outfits/${encodeURIComponent(outfitId)}`, { signal });

  // huma answers 422 for an ID that isn't a UUID, which can't name an outfit either.
  if (response.status === 404 || response.status === 422) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/** GET /api/v1/outfits/{id}, shared by the details and edit pages so they read one cache entry. */
export function outfitQueryOptions(outfitId: string) {
  return queryOptions({
    queryKey: ["outfit", outfitId],
    queryFn: ({ signal }) => fetchOutfit(outfitId, signal),
  });
}
