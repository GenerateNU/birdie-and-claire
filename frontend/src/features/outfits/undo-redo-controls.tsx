import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from "@phosphor-icons/react";

import { Box, IconButton } from "@/design-system";

type UndoRedoControlsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

const ICON_SIZE = "[&_svg]:size-[40px]";

export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) {
  return (
    <Box className="flex items-center gap-xxs">
      <IconButton
        icon={ArrowUUpLeftIcon}
        label="Undo"
        variant="plain"
        disabled={!canUndo}
        onClick={onUndo}
        className={ICON_SIZE}
      />
      <IconButton
        icon={ArrowUUpRightIcon}
        label="Redo"
        variant="plain"
        disabled={!canRedo}
        onClick={onRedo}
        className={ICON_SIZE}
      />
    </Box>
  );
}
