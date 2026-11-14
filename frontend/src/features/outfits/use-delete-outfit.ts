import { useMutation, useQueryClient, type InfiniteData, type Query } from "@tanstack/react-query";

import {
  deleteOutfitMutation,
  getOutfitQueryKey,
  listCollectionOutfitsInfiniteQueryKey,
  listCollectionsQueryKey,
  listOutfitsInfiniteQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { ErrorModel, PageOutfitResponse } from "@/api/generated/types.gen";
import { useToast } from "@/design-system";
import { isAlreadyDeleted, withoutOutfit } from "@/features/outfits/saved-outfits";

// The saved outfits and each collection's outfits are separate lists of the same cards, so a deleted
// outfit has to leave all of them. The generated keys carry the endpoint's id, so it is read from them.
const outfitListIds = new Set([
  listOutfitsInfiniteQueryKey()[0]._id,
  listCollectionOutfitsInfiniteQueryKey({ path: { id: "" } })[0]._id,
]);

function isOutfitList(query: Query): boolean {
  // SAFETY: every key the generated client makes is a one-item array of its params, with the id in it.
  const [params] = query.queryKey as ReturnType<typeof listOutfitsInfiniteQueryKey>;

  return params._infinite === true && outfitListIds.has(params._id);
}

export function useDeleteOutfit() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const deleteOptions = deleteOutfitMutation();

  // The toast and the list refresh are options of the mutation, not of mutate(), so they still run
  // when the user leaves the page while the delete is in flight.
  const mutation = useMutation({
    ...deleteOptions,
    mutationFn: async (...args: Parameters<NonNullable<typeof deleteOptions.mutationFn>>) => {
      try {
        await deleteOptions.mutationFn?.(...args);
      } catch (error) {
        // SAFETY: the API client throws an ApiError, which carries the response's status. Any other
        // failure, such as a dropped connection, has none, and isAlreadyDeleted reads it as undefined.
        if (!isAlreadyDeleted(error as ErrorModel)) {
          throw error;
        }
      }
    },
    onSuccess: (_data, variables) => {
      const outfitId = variables.path.id;

      toast.show({ message: "Outfit deleted", variant: "success" });
      // The card leaves every list now, so the modal doesn't wait on the list endpoint and a refresh
      // that fails can't leave a deleted outfit behind. The refresh then settles anything else.
      queryClient.setQueriesData<InfiniteData<PageOutfitResponse>>(
        { predicate: isOutfitList },
        (data) => withoutOutfit(data, outfitId),
      );
      queryClient.removeQueries({ queryKey: getOutfitQueryKey({ path: { id: outfitId } }) });
      void queryClient.invalidateQueries({ predicate: isOutfitList });
      // A collection shows how many outfits it holds, and pictures of its newest ones.
      void queryClient.invalidateQueries({ queryKey: listCollectionsQueryKey() });
    },
  });

  return {
    isPending: mutation.isPending,
    /** The message for a failed delete, or null. */
    errorMessage: mutation.isError ? "Couldn't delete the outfit. Try again." : null,
    reset: mutation.reset,
    /** `onDeleted` runs only while the caller is still mounted, so it is for the caller's own UI. */
    deleteOutfit: (outfitId: string, onDeleted: () => void) =>
      mutation.mutate({ path: { id: outfitId } }, { onSuccess: onDeleted }),
  };
}
