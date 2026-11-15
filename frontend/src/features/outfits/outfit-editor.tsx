import { QuestionIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ComponentProps, type ReactNode } from "react";

import { Box, Button, Modal, PageHeader, useToast } from "@/design-system";
import { ExitFlowButton } from "@/features/navigation/exit-flow-button";
import { useEditorSelection } from "@/features/outfits/editor-selection";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { useOutfitDraft } from "@/features/outfits/outfit-draft";
import type { Product } from "@/features/outfits/outfit-items";
import { OutfitSlotsPanel } from "@/features/outfits/outfit-slots-panel";
import { SaveOutfitDialog, type SaveOutfitValues } from "@/features/outfits/save-outfit-dialog";
import { SlotPicker } from "@/features/outfits/slot-picker";
import { UndoRedoControls } from "@/features/outfits/undo-redo-controls";
import { useLeaveGuard } from "@/features/outfits/use-leave-guard";

/** What the editor hands its caller to save. */
export type OutfitEditorSave = {
  values: SaveOutfitValues;
  productIds: string[];
  productsChanged: boolean;
};

type OutfitEditorProps = {
  /** MUST keep the same reference until the outfit changes: a new array starts the draft over. */
  initialProducts: Product[];
  /** What the save dialog starts with. */
  details: { name: string; description: string; tags: string[] };
  /** A new outfit can be saved without changes, since saving is what creates it. */
  isNew: boolean;
  /** The outfit to ask for suggestions, or null for a draft with no saved outfit behind it. */
  suggestionsOutfitId: string | null;
  saving: boolean;
  /** Saves the outfit, then calls `onSaved` with its id. Failures are the caller's to report. */
  onSave: (save: OutfitEditorSave, onSaved: (outfitId: string) => void) => void;
};

type EditorFrameProps = {
  onSave: () => void;
  saveDisabled: boolean;
  onExit: () => void;
  children: ReactNode;
};

/** Builds an outfit on the canvas, one slot at a time, and saves it. */
export function OutfitEditor({
  initialProducts,
  details,
  isNew,
  suggestionsOutfitId,
  saving,
  onSave,
}: OutfitEditorProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const draft = useOutfitDraft({ products: initialProducts });
  const selection = useEditorSelection(draft.items);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const leave = useLeaveGuard(draft.isDirty);
  const productsChanged = isNew || draft.isDirty;

  function save(values: SaveOutfitValues) {
    onSave(
      { values, productIds: draft.items.map((item) => item.product.id), productsChanged },
      (outfitId) => {
        // The draft resets only on the next render, so the guard still sees unsaved edits here,
        // and a navigation held during the save is answered with stay before the move below.
        leave.allowLeaving();
        leave.stay();
        toast.show({ message: "Outfit Saved!" });
        void navigate({ to: "/outfits/$outfitId", params: { outfitId }, replace: true });
      },
    );
  }

  function exit() {
    leave.allowLeaving();
    void navigate({ to: "/profile/outfits" });
  }

  function pick(product: Product) {
    const panel = selection.panel;

    if (panel === null) {
      return;
    }

    if ("slot" in panel) {
      draft.add(product);
      selection.afterAdd(product.id);

      return;
    }

    draft.swap(panel.originId, product);
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
      disabled: saving || draft.items.length === 0,
    },
  ];

  return (
    <EditorFrame
      onSave={() => setSaveDialogOpen(true)}
      // The API needs at least one product in an outfit.
      saveDisabled={draft.items.length === 0}
      onExit={exit}
    >
      {/* Side by side from lg up. Narrower than that, the panel would squeeze the canvas to
          nothing, so the panels stack. */}
      {/* Inert while saving: edits made after the body is sent would be lost when it resets. */}
      <main inert={saving} className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Box className="min-h-0 min-w-0 flex-1">
          <OutfitCanvas
            products={draft.items.map((item) => item.product)}
            editing={{
              originIdByProductId: new Map(
                draft.items.map((item) => [item.product.id, item.original.id]),
              ),
              selectedOriginId: selection.selectedOriginId,
              onSelect: selection.select,
              onRemove: draft.remove,
            }}
          >
            <Button
              label="Help"
              variant="ghost"
              size="sm"
              leadingIcon={QuestionIcon}
              disabled
              className="absolute left-md top-md z-10"
            />
            <Box className="absolute right-md top-md z-10">
              <UndoRedoControls
                canUndo={draft.canUndo}
                canRedo={draft.canRedo}
                onUndo={draft.undo}
                onRedo={draft.redo}
              />
            </Box>
          </OutfitCanvas>
        </Box>
        <Box className="h-2/5 overflow-y-auto border-t px-xl py-lg lg:h-auto lg:w-editor-panel lg:shrink-0 lg:border-l lg:border-t-0">
          <EditorPanel
            draft={draft}
            selection={selection}
            suggestionsOutfitId={suggestionsOutfitId}
            onPick={pick}
          />
        </Box>
      </main>
      <SaveOutfitDialog
        open={saveDialogOpen}
        savedName={details.name}
        savedDescription={details.description}
        savedTags={details.tags}
        productsChanged={productsChanged}
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

type EditorPanelProps = {
  draft: ReturnType<typeof useOutfitDraft>;
  selection: ReturnType<typeof useEditorSelection>;
  suggestionsOutfitId: string | null;
  onPick: (product: Product) => void;
};

/** The slot cards, or the picker for the slot or spot being edited. */
function EditorPanel({ draft, selection, suggestionsOutfitId, onPick }: EditorPanelProps) {
  const { panel } = selection;

  if (panel === null) {
    return (
      <OutfitSlotsPanel
        items={draft.items}
        panel={panel}
        onAdd={selection.openSlot}
        onSwap={selection.select}
      />
    );
  }

  const pickerProps = {
    suggestionsOutfitId,
    onPick,
    onBack: () => selection.select(null),
  };

  if ("slot" in panel) {
    return (
      <SlotPicker
        // Keyed by slot, so a new slot starts on its default tab, and filling an empty slot moves
        // the picker onto the new spot without jumping tabs.
        key={panel.slot}
        slot={panel.slot}
        spot={null}
        takenProductIds={new Set(draft.items.map((item) => item.product.id))}
        {...pickerProps}
      />
    );
  }

  const current = draft.items.find((item) => item.original.id === panel.originId);

  // The selection hook drops a spot once it leaves the draft.
  if (current === undefined) {
    throw new Error(`editor panel: no spot ${panel.originId} in the draft`);
  }

  return (
    <SlotPicker
      key={current.product.slot}
      slot={current.product.slot}
      spot={{ original: current.original, currentProductId: current.product.id }}
      takenProductIds={
        new Set(draft.items.filter((item) => item !== current).map((item) => item.product.id))
      }
      {...pickerProps}
    />
  );
}

/** Fills the window, so the panels under the header take the height that's left. */
export function EditorFrame({ onSave, saveDisabled, onExit, children }: EditorFrameProps) {
  return (
    <Box className="flex h-screen flex-col">
      <PageHeader
        title="Edit Outfit"
        logoTo="/profile/outfits"
        actions={
          <>
            <Button label="Save outfit" onClick={onSave} disabled={saveDisabled} />
            <ExitFlowButton onExit={onExit} />
          </>
        }
      />
      {children}
    </Box>
  );
}
