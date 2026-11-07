import { getOutfitOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { ErrorModel } from "@/api/generated/types.gen";

const MAX_RETRIES = 3;

/** huma answers 422 for an ID that isn't a UUID, which can't name an outfit either. */
export function isOutfitNotFound(error: ErrorModel | null): boolean {
  return error?.status === 404 || error?.status === 422;
}

/** The outfit query both outfit pages share, so moving between them doesn't refetch. */
export function outfitQueryOptions(outfitId: string) {
  return {
    ...getOutfitOptions({ path: { id: outfitId } }),
    // Asking again won't make a missing outfit appear.
    retry: (failureCount: number, error: ErrorModel) =>
      !isOutfitNotFound(error) && failureCount < MAX_RETRIES,
  };
}
