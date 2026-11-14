import { Button as BaseButton } from "@base-ui/react/button";
import { ArrowsLeftRightIcon, EyeIcon, EyeSlashIcon, PlusIcon } from "@phosphor-icons/react";

import stamp from "@/design-system/assets/stamp.png";
import { Button } from "@/design-system/components/buttons/button";
import { CardImage } from "@/design-system/components/cards/card-image";
import { Box } from "@/design-system/primitives/box";

type EmptySlotProps = {
  title: string;
  piece: null;
  onAdd: () => void;
};

type FilledSlotProps = {
  title: string;
  piece: { src: string | null; bcStamp: boolean };
  onSwap?: () => void;
  /** Adds Hide/Show. Left out where the outfit can't hide pieces yet. */
  visibility?: { hidden: boolean; onHiddenChange: (hidden: boolean) => void };
  selected?: boolean;
};

type OutfitSlotProps = EmptySlotProps | FilledSlotProps;

/** One piece slot in the outfit editor's panel. */
export function OutfitSlot(props: OutfitSlotProps) {
  if (props.piece === null) {
    return (
      <Box className="flex w-outfit-slot flex-col gap-xs border bg-card p-xs text-primary">
        <Box className="truncate text-label-l-strong">{props.title}</Box>
        <BaseButton
          type="button"
          aria-label={`Add ${props.title}`}
          onClick={props.onAdd}
          className="flex h-outfit-slot-empty w-full items-center justify-center border border-dashed border-primary bg-surface hover:bg-hover focus-ring"
        >
          <PlusIcon size={28} aria-hidden="true" />
        </BaseButton>
      </Box>
    );
  }

  const { title, piece, onSwap, visibility, selected = false } = props;
  const hidden = visibility?.hidden ?? false;
  const outline = selected ? "border-thick border-primary" : "border";

  return (
    <Box className={`flex w-outfit-slot flex-col gap-xs bg-card p-xs ${outline}`}>
      <Box className={`truncate text-label-l-strong ${hidden ? "text-secondary" : "text-primary"}`}>
        {title}
      </Box>
      <Box className="relative h-outfit-slot-photo w-full bg-surface">
        <CardImage
          src={piece.src}
          fit="contain"
          className={`size-full ${hidden ? "opacity-hidden-piece" : ""}`}
        />
        {piece.bcStamp && (
          <img
            src={stamp}
            alt=""
            className="absolute right-xs top-xs size-stamp-sm mix-blend-multiply"
          />
        )}
      </Box>
      {onSwap && (
        <Box className="flex gap-xs">
          <Button
            label="Swap"
            accessibleLabel={`Swap ${title}`}
            variant="ghost"
            size="sm"
            leadingIcon={ArrowsLeftRightIcon}
            onClick={onSwap}
          />
          {visibility && (
            <Button
              label={hidden ? "Show" : "Hide"}
              accessibleLabel={`${hidden ? "Show" : "Hide"} ${title}`}
              variant="ghost"
              size="sm"
              leadingIcon={hidden ? EyeIcon : EyeSlashIcon}
              onClick={() => visibility.onHiddenChange(!hidden)}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
