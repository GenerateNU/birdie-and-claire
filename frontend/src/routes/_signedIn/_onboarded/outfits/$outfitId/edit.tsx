import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ComponentProps, type ReactNode } from "react";

import {
  getOutfitQueryKey,
  listOutfitsInfiniteQueryKey,
  updateOutfitMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { OutfitResponse, UpdateOutfitInputBody } from "@/api/generated/types.gen";
import {
  Box,
  Button,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  Spinner,
  useToast,
} from "@/design-system";
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
  onSave: () => void;
  saveDisabled: boolean;
  children: ReactNode;
};

// Save stays disabled until the outfit has loaded, so the frames around the other states pass this.
function ignoreSave() {}

function OutfitEditorPage() {
  const { outfitId } = Route.useParams();

  const outfitQuery = useQuery(outfitQueryOptions(outfitId));

  if (outfitQuery.isPending) {
    return (
      <EditorFrame onSave={ignoreSave} saveDisabled>
        <Spinner className="m-lg" />
      </EditorFrame>
    );
  }

  if (isOutfitNotFound(outfitQuery.error)) {
    return (
      <EditorFrame onSave={ignoreSave} saveDisabled>
        <EmptyState title="Outfit not found" className="px-lg" />
      </EditorFrame>
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the outfit on screen.
  if (outfitQuery.data === undefined) {
    return (
      <EditorFrame onSave={ignoreSave} saveDisabled>
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const leave = useLeaveGuard(draft.isDirty);

  const saveMutation = useMutation({
    ...updateOutfitMutation(),
    // Offline, the default mode pauses the save forever while the editor is inert; this fails fast.
    networkMode: "always",
    onSuccess: (saved) => {
      queryClient.setQueryData(getOutfitQueryKey({ path: { id: outfitId } }), saved);
      void queryClient.invalidateQueries({ queryKey: listOutfitsInfiniteQueryKey() });
      // The draft resets only on the next render, so the guard still sees unsaved edits here, and a
      // navigation held during the save is answered with stay before the move below.
      leave.allowLeaving();
      leave.stay();
      void navigate({ to: "/outfits/$outfitId", params: { outfitId }, replace: true });
    },
    onError: () =>
      toast.show({ message: "Couldn't save your outfit. Try again.", variant: "error" }),
  });

  const saving = saveMutation.isPending;

  function save(name: string) {
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

  // Disabled while saving, so a navigation held mid-save can't leave or open a second save.
  const leaveDialogActions: ComponentProps<typeof Modal>["actions"] = [
    { label: "Exit", variant: "ghost", onClick: leave.exit, disabled: saving },
    {
      label: "Save",
      variant: "primary",
      onClick: () => {
        leave.stay();
        setSaveDialogOpen(true);
      },
      disabled: saving,
    },
  ];

  return (
    <EditorFrame onSave={() => setSaveDialogOpen(true)} saveDisabled={false}>
      {/* Side by side from lg up. Narrower than that, the 576px details panel would squeeze the
          canvas to nothing, so the panels stack. */}
      {/* Inert while saving: edits made after the body is sent would be lost when it resets. */}
      <main inert={saving} className="flex min-h-0 flex-1 flex-col gap-xs p-xs pt-md lg:flex-row">
        <Box className="min-h-0 min-w-0 flex-1">
          <OutfitCanvas
            products={draft.items.map((item) => item.product)}
            editing={{
              originIdByProductId: new Map(
                draft.items.map((item) => [item.product.id, item.original.id]),
              ),
              selectedOriginId: selection.selectedOriginId,
              onSelect: selection.select,
              onRemove: remove,
            }}
          >
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
            items={draft.items}
            originId={selection.panelOriginId}
            onSwap={swap}
            onPickSpot={selection.select}
            onBack={() => selection.select(null)}
          />
        </Box>
      </main>
      <SaveOutfitDialog
        open={saveDialogOpen}
        savedName={outfit.name}
        productsChanged={draft.isDirty}
        saving={saving}
        onCancel={() => setSaveDialogOpen(false)}
        onSave={save}
      />
      <Modal
        open={leave.blocked}
        onClose={leave.stay}
        title="You have unsaved outfit edits"
        message="Save your edits before leaving."
        actions={leaveDialogActions}
      />
    </EditorFrame>
  );
}

/** Fills the window, so the panels under the header take the height that's left. */
function EditorFrame({ onSave, saveDisabled, children }: EditorFrameProps) {
  return (
    <Box className="flex h-screen flex-col">
      <PageHeader
        title="Edit Outfit"
        logoTo="/profile/outfits"
        actions={<Button label="Save" onClick={onSave} disabled={saveDisabled} />}
      />
      {children}
    </Box>
  );
}
