import { getOutfitOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { ErrorModel } from "@/api/generated/types.gen";

const MAX_RETRIES = 3;

/** huma answers 422 for an ID that isn't a UUID, which can't name an outfit either. */
export function isOutfitNotFound(error: ErrorModel | null): boolean {
  return error?.status === 404 || error?.status === 422;
}

/** A query `retry` for an outfit: asking again won't make a missing one appear. */
export function retryUnlessOutfitNotFound(failureCount: number, error: ErrorModel): boolean {
  return !isOutfitNotFound(error) && failureCount < MAX_RETRIES;
}

/** The outfit query both outfit pages share, so moving between them doesn't refetch. */
export function outfitQueryOptions(outfitId: string) {
  return {
    ...getOutfitOptions({ path: { id: outfitId } }),
    retry: retryUnlessOutfitNotFound,
  };
}
