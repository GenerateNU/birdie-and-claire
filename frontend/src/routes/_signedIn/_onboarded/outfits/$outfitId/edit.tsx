import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  getOutfitQueryKey,
  listOutfitsInfiniteQueryKey,
  updateOutfitMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { OutfitResponse, UpdateOutfitInputBody } from "@/api/generated/types.gen";
import { EmptyState, ErrorState, Spinner, useToast } from "@/design-system";
import { EditorFrame, OutfitEditor, type OutfitEditorSave } from "@/features/outfits/outfit-editor";
import { isOutfitNotFound, outfitQueryOptions } from "@/features/outfits/outfit-query";
import { sameTags } from "@/features/outfits/tags-field";

export const Route = createFileRoute("/_signedIn/_onboarded/outfits/$outfitId/edit")({
  component: EditOutfitPage,
});

// Save stays disabled until the outfit has loaded, so the frames around the other states pass this.
function ignoreSave() {}

function EditOutfitPage() {
  const { outfitId } = Route.useParams();
  const navigate = useNavigate();

  const outfitQuery = useQuery(outfitQueryOptions(outfitId));
  const exit = () => void navigate({ to: "/profile/outfits" });

  if (outfitQuery.isPending) {
    return (
      <EditorFrame onSave={ignoreSave} saveDisabled onExit={exit}>
        <Spinner className="m-lg" />
      </EditorFrame>
    );
  }

  if (isOutfitNotFound(outfitQuery.error)) {
    return (
      <EditorFrame onSave={ignoreSave} saveDisabled onExit={exit}>
        <EmptyState title="Outfit not found" className="px-lg" />
      </EditorFrame>
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the outfit on screen.
  if (outfitQuery.data === undefined) {
    return (
      <EditorFrame onSave={ignoreSave} saveDisabled onExit={exit}>
        <ErrorState
          message="Couldn't load this outfit."
          onRetry={() => void outfitQuery.refetch()}
          className="p-lg"
        />
      </EditorFrame>
    );
  }

  return <EditSavedOutfit outfitId={outfitId} outfit={outfitQuery.data} />;
}

type EditSavedOutfitProps = {
  outfitId: string;
  outfit: OutfitResponse;
};

/** The editor over a saved outfit, which saves the changes back to it. */
function EditSavedOutfit({ outfitId, outfit }: EditSavedOutfitProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const saveMutation = useMutation({
    ...updateOutfitMutation(),
    // Offline, the default mode pauses the save forever while the editor is inert; this fails fast.
    networkMode: "always",
    onSuccess: (saved) => {
      queryClient.setQueryData(getOutfitQueryKey({ path: { id: outfitId } }), saved);
      void queryClient.invalidateQueries({ queryKey: listOutfitsInfiniteQueryKey() });
    },
    onError: () =>
      toast.show({ message: "Couldn't save your outfit. Try again.", variant: "error" }),
  });

  function save(
    { values, productIds, productsChanged }: OutfitEditorSave,
    onSaved: (id: string) => void,
  ) {
    const body: UpdateOutfitInputBody = {};

    if (values.name !== outfit.name) {
      body.name = values.name;
    }

    if (values.description !== outfit.description) {
      body.description = values.description;
    }

    if (!sameTags(values.tags, outfit.tags)) {
      body.tags = values.tags;
    }

    if (productsChanged) {
      body.product_ids = productIds;
    }

    saveMutation.mutate({ path: { id: outfitId }, body }, { onSuccess: () => onSaved(outfitId) });
  }

  return (
    <OutfitEditor
      initialProducts={outfit.products}
      details={outfit}
      isNew={false}
      suggestionsOutfitId={outfitId}
      saving={saveMutation.isPending}
      onSave={save}
    />
  );
}
