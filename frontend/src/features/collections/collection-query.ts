import { getCollectionOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { ErrorModel } from "@/api/generated/types.gen";

const MAX_RETRIES = 3;

/** huma answers 422 for an ID that isn't a UUID, which can't name a collection either. */
export function isCollectionNotFound(error: ErrorModel | null): boolean {
  return error?.status === 404 || error?.status === 422;
}

export function collectionQueryOptions(collectionId: string) {
  return {
    ...getCollectionOptions({ path: { id: collectionId } }),
    // Asking again won't make a missing collection appear.
    retry: (failureCount: number, error: ErrorModel) =>
      !isCollectionNotFound(error) && failureCount < MAX_RETRIES,
  };
}
