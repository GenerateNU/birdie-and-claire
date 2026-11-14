import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";

import { Box, IconButton } from "@/design-system";

type UndoRedoControlsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) {
  return (
    <Box className="flex items-center gap-xxs">
      <IconButton
        icon={ArrowCounterClockwiseIcon}
        label="Undo"
        variant="ghost"
        disabled={!canUndo}
        onClick={onUndo}
      />
      <IconButton
        icon={ArrowClockwiseIcon}
        label="Redo"
        variant="ghost"
        disabled={!canRedo}
        onClick={onRedo}
      />
    </Box>
  );
}
