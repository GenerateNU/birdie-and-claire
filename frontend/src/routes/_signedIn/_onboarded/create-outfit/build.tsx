import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import {
  createOutfitMutation,
  getOutfitQueryKey,
  listOutfitsInfiniteQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { EmptyState, ErrorState, Spinner, useToast } from "@/design-system";
import { EditorFrame, OutfitEditor, type OutfitEditorSave } from "@/features/outfits/outfit-editor";
import type { Product } from "@/features/outfits/outfit-items";
import { isOutfitNotFound, outfitQueryOptions } from "@/features/outfits/outfit-query";

export const Route = createFileRoute("/_signedIn/_onboarded/create-outfit/build")({
  // `base` is a saved outfit to start from. Without it the canvas starts empty.
  validateSearch: z.object({ base: z.string().optional() }),
  component: BuildOutfitPage,
});

// Kept outside the component: the draft starts over whenever its products change reference.
const noProducts: Product[] = [];

const blankDetails = { name: "", description: "", tags: [] };

// Save stays disabled until the base has loaded, so the frames around the other states pass this.
function ignoreSave() {}

function BuildOutfitPage() {
  const { base } = Route.useSearch();

  if (base === undefined) {
    return (
      <NewOutfitEditor
        initialProducts={noProducts}
        details={blankDetails}
        suggestionsOutfitId={null}
      />
    );
  }

  return <FromBaseEditor baseId={base} />;
}

function FromBaseEditor({ baseId }: { baseId: string }) {
  const navigate = useNavigate();
  const baseQuery = useQuery(outfitQueryOptions(baseId));
  const exit = () => void navigate({ to: "/profile/outfits" });

  if (baseQuery.isPending) {
    return (
      <EditorFrame onSave={ignoreSave} saveDisabled onExit={exit}>
        <Spinner className="m-lg" />
      </EditorFrame>
    );
  }

  if (isOutfitNotFound(baseQuery.error)) {
    return (
      <EditorFrame onSave={ignoreSave} saveDisabled onExit={exit}>
        <EmptyState title="Outfit not found" className="px-lg" />
      </EditorFrame>
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the base on screen.
  if (baseQuery.data === undefined) {
    return (
      <EditorFrame onSave={ignoreSave} saveDisabled onExit={exit}>
        <ErrorState
          message="Couldn't load this outfit."
          onRetry={() => void baseQuery.refetch()}
          className="p-lg"
        />
      </EditorFrame>
    );
  }

  const { products, name, description, tags } = baseQuery.data;

  return (
    <NewOutfitEditor
      initialProducts={products}
      details={{ name, description, tags }}
      // Suggestions only need an outfit the user owns, so the base answers for the new one.
      suggestionsOutfitId={baseId}
    />
  );
}

type NewOutfitEditorProps = {
  initialProducts: Product[];
  details: { name: string; description: string; tags: string[] };
  suggestionsOutfitId: string | null;
};

/** The editor over a draft that becomes a new outfit when saved. */
function NewOutfitEditor({ initialProducts, details, suggestionsOutfitId }: NewOutfitEditorProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const createMutation = useMutation({
    ...createOutfitMutation(),
    // Offline, the default mode pauses the save forever while the editor is inert; this fails fast.
    networkMode: "always",
    onSuccess: (created) => {
      queryClient.setQueryData(getOutfitQueryKey({ path: { id: created.id } }), created);
      void queryClient.invalidateQueries({ queryKey: listOutfitsInfiniteQueryKey() });
    },
    onError: () =>
      toast.show({ message: "Couldn't save your outfit. Try again.", variant: "error" }),
  });

  function save({ values, productIds }: OutfitEditorSave, onSaved: (id: string) => void) {
    createMutation.mutate(
      { body: { ...values, product_ids: productIds } },
      { onSuccess: (created) => onSaved(created.id) },
    );
  }

  return (
    <OutfitEditor
      initialProducts={initialProducts}
      details={details}
      isNew
      suggestionsOutfitId={suggestionsOutfitId}
      saving={createMutation.isPending}
      onSave={save}
    />
  );
}
