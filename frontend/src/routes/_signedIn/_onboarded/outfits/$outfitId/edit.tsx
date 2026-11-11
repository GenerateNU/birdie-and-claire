import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import {
  getOutfitQueryKey,
  listOutfitsInfiniteQueryKey,
  updateOutfitMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { OutfitResponse, UpdateOutfitInputBody } from "@/api/generated/types.gen";
import { Box, Button, Dialog, Empty, ErrorState, Spinner, useToast } from "@/design-system";
import { EditorHeader } from "@/features/outfits/editor-header";
import { useEditorSelection } from "@/features/outfits/editor-selection";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { useOutfitDraft } from "@/features/outfits/outfit-draft";
import type { Product } from "@/features/outfits/outfit-items";
import { isOutfitNotFound, outfitQueryOptions } from "@/features/outfits/outfit-query";
import { SaveOutfitDialog } from "@/features/outfits/save-outfit-dialog";
import { SwapPanel } from "@/features/outfits/swap-panel";
import { UndoRedoControls } from "@/features/outfits/undo-redo-controls";
import { useLeaveGuard } from "@/features/outfits/use-leave-guard";

export const Route = createFileRoute("/_signedIn/_onboarded/outfits/$outfitId/edit")({
  component: OutfitEditorPage,
});

type EditorFrameProps = {
  onSave?: () => void;
  name?: string;
  onRename?: () => void;
  children: ReactNode;
};

function OutfitEditorPage() {
  const { outfitId } = Route.useParams();

  const outfitQuery = useQuery(outfitQueryOptions(outfitId));

  if (outfitQuery.isPending) {
    return (
      <EditorFrame>
        <Spinner className="m-lg" />
      </EditorFrame>
    );
  }

  if (isOutfitNotFound(outfitQuery.error)) {
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
  // Tied to the saved name it was typed against, so it drops away once a save changes that name.
  const [rename, setRename] = useState<{ base: string; name: string } | null>(null);
  const name = rename?.base === outfit.name ? rename.name : outfit.name;
  const isDirty = draft.isDirty || name !== outfit.name;

  const saveMutation = useMutation({
    ...updateOutfitMutation(),
    onSuccess: (saved) => {
      // The guard is off while the mutation is pending, and resetting the draft keeps it off after.
      queryClient.setQueryData(getOutfitQueryKey({ path: { id: outfitId } }), saved);
      void queryClient.invalidateQueries({ queryKey: listOutfitsInfiniteQueryKey() });
      void navigate({ to: "/outfits/$outfitId", params: { outfitId }, replace: true });
    },
    onError: () => toast.show({ message: "Couldn't save your outfit. Try again." }),
  });

  const leave = useLeaveGuard(isDirty && !saveMutation.isPending);

  // Only reachable while dirty, so the body always holds at least one field.
  function save() {
    const body: UpdateOutfitInputBody = {};

    if (name !== outfit.name) {
      body.name = name;
    }

    if (draft.isDirty) {
      body.product_ids = draft.items.map((item) => item.product.id);
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
    <EditorFrame onSave={isDirty ? save : undefined} name={name} onRename={() => setNaming(true)}>
      {/* Side by side from lg up. Narrower than that, the 576px details panel would squeeze the
          canvas to nothing, so the panels stack. */}
      <main className="flex min-h-0 flex-1 flex-col gap-xs p-xs pt-md lg:flex-row">
        <Box className="min-h-0 min-w-0 flex-1">
          <OutfitCanvas
            products={draft.items.map((item) => item.product)}
            editing={{
              originIdByProductId: new Map(
                draft.items.map((item) => [item.product.id, item.originId]),
              ),
              selectedOriginId: selection.selectedOriginId,
              onSelect: selection.select,
              onRemove: remove,
            }}
          >
            {/* Help content comes with outfit editing. */}
            <Button
              label="Help"
              variant="secondary"
              disabled
              className="absolute left-sm top-md z-10"
            />
            <Box className="absolute right-sm top-md z-10">
              <UndoRedoControls
                canUndo={draft.canUndo}
                canRedo={draft.canRedo}
                onUndo={draft.undo}
                onRedo={draft.redo}
              />
            </Box>
          </OutfitCanvas>
        </Box>
        <Box className="h-2/5 lg:h-auto lg:w-content-md lg:shrink-0">
          <SwapPanel
            outfitId={outfitId}
            savedProducts={outfit.products}
            items={draft.items}
            originId={selection.panelOriginId}
            onSwap={swap}
            onPickSpot={selection.select}
            onBack={() => selection.select(null)}
          />
        </Box>
      </main>
      <SaveOutfitDialog
        open={naming}
        name={name}
        onCancel={() => setNaming(false)}
        onSave={(newName) => {
          setRename({ base: outfit.name, name: newName });
          setNaming(false);
        }}
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
              save();
            },
          },
        ]}
      />
    </EditorFrame>
  );
}

/** Fills the window, so the panels under the header take the height that's left. */
function EditorFrame({ onSave, name, onRename, children }: EditorFrameProps) {
  return (
    <Box className="flex h-screen flex-col">
      <EditorHeader onSave={onSave} name={name} onRename={onRename} />
      {children}
    </Box>
  );
}
