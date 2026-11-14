import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from "@phosphor-icons/react";

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
        icon={ArrowUUpLeftIcon}
        label="Undo"
        variant="ghost"
        disabled={!canUndo}
        onClick={onUndo}
      />
      <IconButton
        icon={ArrowUUpRightIcon}
        label="Redo"
        variant="ghost"
        disabled={!canRedo}
        onClick={onRedo}
      />
    </Box>
  );
}
