import { Button as BaseButton } from "@base-ui/react/button";
import { PlusIcon } from "@phosphor-icons/react";

import { Box } from "@/design-system/primitives/box";

const sizeClasses = {
  lg: {
    tile: "h-add-tile-lg w-add-tile-lg gap-lg",
    textGap: "gap-sm",
    title: "font-serif text-heading-m-italic italic",
    label: "text-overline",
    iconSize: 28,
  },
  sm: {
    tile: "h-add-tile-sm w-add-tile-sm gap-xs",
    textGap: "gap-xxs",
    title: "text-label-l-strong",
    label: "text-overline",
    iconSize: 20,
  },
  collection: {
    tile: "h-collection w-collection gap-lg",
    textGap: "gap-sm",
    title: "text-label-l-strong",
    label: "text-label-m",
    iconSize: 28,
  },
};

type AddTileProps = {
  label: string;
  /** A line above the label. */
  title?: string;
  /** `collection` is as big as a collection card, for the end of a collections grid. */
  size?: keyof typeof sizeClasses;
  onClick: () => void;
};

/** A dashed "+ add" tile that ends a row of cards. */
export function AddTile({ label, title, size = "lg", onClick }: AddTileProps) {
  const { tile, textGap, title: titleClasses, label: labelClasses, iconSize } = sizeClasses[size];

  return (
    <BaseButton
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center whitespace-nowrap border border-dashed border-primary text-center text-primary hover:bg-hover focus-ring ${tile}`}
    >
      <PlusIcon size={iconSize} aria-hidden="true" />
      <Box className={`flex flex-col items-center ${textGap}`}>
        {title && <Box className={titleClasses}>{title}</Box>}
        <Box className={`${labelClasses} uppercase text-secondary`}>{label}</Box>
      </Box>
    </BaseButton>
  );
}
