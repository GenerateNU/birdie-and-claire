import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createCollectionMutation,
  listCollectionsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { useToast } from "@/design-system";

/** Creates a collection. Pass what the caller does next to `mutate`'s own `onSuccess`. */
export function useCreateCollection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    ...createCollectionMutation(),
    // Returned, so the create stays pending until the collection lists include the new one.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listCollectionsQueryKey() }),
    onError: () =>
      toast.show({ message: "Couldn't create the collection. Try again.", variant: "error" }),
  });
}
