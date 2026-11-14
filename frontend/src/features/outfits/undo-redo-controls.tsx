import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";

import { Box, Button } from "@/design-system";

type UndoRedoControlsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) {
  return (
    <Box className="flex items-center gap-xs">
      <Button
        label="Undo"
        variant="ghost"
        size="sm"
        leadingIcon={ArrowCounterClockwiseIcon}
        disabled={!canUndo}
        onClick={onUndo}
      />
      <Button
        label="Redo"
        variant="ghost"
        size="sm"
        leadingIcon={ArrowClockwiseIcon}
        disabled={!canRedo}
        onClick={onRedo}
      />
    </Box>
  );
}
