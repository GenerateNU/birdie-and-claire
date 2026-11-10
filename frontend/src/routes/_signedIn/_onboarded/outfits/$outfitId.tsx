import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import {
  getOutfitOptions,
  getOutfitQueryKey,
  listOutfitsInfiniteQueryKey,
  updateOutfitMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { ErrorModel, OutfitResponse, UpdateOutfitInputBody } from "@/api/generated/types.gen";
import { Box, Dialog, Empty, ErrorState, Spinner, useToast } from "@/design-system";
import { EditorHeader } from "@/features/outfits/editor-header";
import { useEditorSelection } from "@/features/outfits/editor-selection";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { useOutfitDraft } from "@/features/outfits/outfit-draft";
import type { Product } from "@/features/outfits/outfit-items";
import { SaveOutfitDialog } from "@/features/outfits/save-outfit-dialog";
import { SwapPanel } from "@/features/outfits/swap-panel";
import { UndoRedoControls } from "@/features/outfits/undo-redo-controls";
import { useLeaveGuard } from "@/features/outfits/use-leave-guard";

export const Route = createFileRoute("/_signedIn/_onboarded/outfits/$outfitId")({
  component: OutfitPage,
});

type EditorFrameProps = {
  onSave?: () => void;
  children: ReactNode;
};

// huma answers 422 for an ID that isn't a UUID, which can't name an outfit either.
function isNotFound(error: ErrorModel | null) {
  return error?.status === 404 || error?.status === 422;
}

const MAX_RETRIES = 3;

function OutfitPage() {
  const { outfitId } = Route.useParams();

  const outfitQuery = useQuery({
    ...getOutfitOptions({ path: { id: outfitId } }),
    // Asking again won't make a missing outfit appear.
    retry: (failureCount, error) => !isNotFound(error) && failureCount < MAX_RETRIES,
  });

  if (outfitQuery.isPending) {
    return (
      <EditorFrame>
        <Spinner className="m-lg" />
      </EditorFrame>
    );
  }

  if (isNotFound(outfitQuery.error)) {
    return (
      <EditorFrame>
        <Empty title="Outfit not found" className="p-lg" />
      </EditorFrame>
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the outfit on screen.
  if (outfitQuery.data === undefined) {
    return (
      <EditorFrame>
        <ErrorState
          message="Couldn't load this outfit."
          onRetry={() => void outfitQuery.refetch()}
          className="p-lg"
        />
      </EditorFrame>
    );
  }

  return <OutfitEditor outfitId={outfitId} outfit={outfitQuery.data} />;
}

type OutfitEditorProps = {
  outfitId: string;
  outfit: OutfitResponse;
};

function OutfitEditor({ outfitId, outfit }: OutfitEditorProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  const draft = useOutfitDraft(outfit);
  const selection = useEditorSelection(draft.items);
  const [naming, setNaming] = useState(false);

  const saveMutation = useMutation({
    ...updateOutfitMutation(),
    onSuccess: (saved) => {
      // The guard is off while the mutation is pending, and resetting the draft keeps it off after.
      queryClient.setQueryData(getOutfitQueryKey({ path: { id: outfitId } }), saved);
      void queryClient.invalidateQueries({ queryKey: listOutfitsInfiniteQueryKey() });
      void navigate({ to: "/profile/outfits" });
    },
    onError: () => toast.show({ message: "Couldn't save your outfit. Try again." }),
  });

  const leave = useLeaveGuard(draft.isDirty && !saveMutation.isPending);

  // The API rejects a body with neither field, so an unchanged outfit skips the request.
  function save(name: string) {
    const body: UpdateOutfitInputBody = {};

    if (name !== outfit.name) {
      body.name = name;
    }

    if (draft.isDirty) {
      body.product_ids = draft.items.map((item) => item.product.id);
    }

    if (body.name === undefined && body.product_ids === undefined) {
      void navigate({ to: "/profile/outfits" });

      return;
    }

    saveMutation.mutate({ path: { id: outfitId }, body });
  }

  function remove(originId: string) {
    if (!draft.remove(originId)) {
      toast.show({ message: "An outfit needs at least one item." });
    }
  }

  function swap(originId: string, product: Product) {
    draft.swap(originId, product);
    selection.afterSwap();
  }

  return (
    <EditorFrame onSave={() => setNaming(true)}>
      {/* Side by side from lg up. Narrower than that, the 576px details panel would squeeze the
          canvas to nothing, so the panels stack. */}
      <main className="flex min-h-0 flex-1 flex-col gap-xs p-xs pt-md lg:flex-row">
        <Box className="min-h-0 min-w-0 flex-1">
          <OutfitCanvas
            items={draft.items}
            selectedOriginId={selection.selectedOriginId}
            onSelect={selection.select}
            onRemove={remove}
            controls={
              <UndoRedoControls
                canUndo={draft.canUndo}
                canRedo={draft.canRedo}
                onUndo={draft.undo}
                onRedo={draft.redo}
              />
            }
          />
        </Box>
        <Box className="h-2/5 lg:h-auto lg:w-content-md lg:shrink-0">
          <SwapPanel
            outfitId={outfitId}
            outfitName={outfit.name}
            savedProducts={outfit.products}
            items={draft.items}
            originId={selection.panelOriginId}
            onSwap={swap}
          />
        </Box>
      </main>
      <SaveOutfitDialog
        open={naming}
        savedName={outfit.name}
        saving={saveMutation.isPending}
        onCancel={() => setNaming(false)}
        onSave={save}
      />
      <Dialog
        open={leave.blocked}
        onClose={leave.stay}
        title="You have unsaved outfit edits"
        message="Save your edits before leaving."
        actions={[
          { label: "Exit", variant: "secondary", onClick: leave.exit },
          {
            label: "Save",
            variant: "primary",
            onClick: () => {
              leave.stay();
              setNaming(true);
            },
          },
        ]}
      />
    </EditorFrame>
  );
}

/** Fills the window, so the panels under the header take the height that's left. */
function EditorFrame({ onSave, children }: EditorFrameProps) {
  return (
    <Box className="flex h-screen flex-col">
      <EditorHeader onSave={onSave} />
      {children}
    </Box>
  );
}
