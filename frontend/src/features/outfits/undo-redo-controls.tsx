import { ArrowUUpLeft, ArrowUUpRight } from "@phosphor-icons/react";

import { Box, Button } from "@/design-system";

type UndoRedoControlsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

// The design-system Button always shows its label, so these show "Undo" and "Redo" next to the
// arrow until it has an icon-only form.
export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) {
  return (
    <Box className="flex items-center gap-xxs">
      <Button
        label="Undo"
        leadingIcon={ArrowUUpLeft}
        variant="secondary"
        size="sm"
        disabled={!canUndo}
        onClick={onUndo}
      />
      <Button
        label="Redo"
        leadingIcon={ArrowUUpRight}
        variant="secondary"
        size="sm"
        disabled={!canRedo}
        onClick={onRedo}
      />
    </Box>
  );
}
