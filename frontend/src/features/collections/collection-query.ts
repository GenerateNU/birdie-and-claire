import { getCollectionOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { ErrorModel } from "@/api/generated/types.gen";

const MAX_RETRIES = 3;

/** huma answers 422 for an ID that isn't a UUID, which can't name a collection either. */
export function isCollectionNotFound(error: ErrorModel | null): boolean {
  return error?.status === 404 || error?.status === 422;
}

/** A query `retry` for a request naming a collection: asking again won't make a missing one appear. */
export function retryUnlessCollectionNotFound(failureCount: number, error: ErrorModel): boolean {
  return !isCollectionNotFound(error) && failureCount < MAX_RETRIES;
}

export function collectionQueryOptions(collectionId: string) {
  return {
    ...getCollectionOptions({ path: { id: collectionId } }),
    retry: retryUnlessCollectionNotFound,
  };
}
