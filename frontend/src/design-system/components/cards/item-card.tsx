import stamp from "@/design-system/assets/stamp.png";
import { CardImage } from "@/design-system/components/cards/card-image";
import {
  CardCheckBox,
  CardFooter,
  CardHoverOutline,
  CardSelectCover,
  CardSelectedRing,
  CardWash,
} from "@/design-system/components/cards/card-parts";
import type { MenuProps } from "@/design-system/components/menu/menu";
import { Box } from "@/design-system/primitives/box";

const sizeClasses = {
  md: {
    card: "w-item-md",
    photo: "h-item-md",
    name: "text-label-l-strong",
    stamp: "size-stamp-md",
    checkBox: "size-lg",
    checkIconSize: 16,
  },
  sm: {
    card: "w-item-sm",
    photo: "h-item-sm",
    name: "text-label-s",
    stamp: "size-stamp-sm",
    checkBox: "size-control",
    checkIconSize: 12,
  },
};

type ItemCardProps = {
  name: string;
  detail?: string;
  src: string | null;
  /** Marks a Birdie & Claire catalog piece. */
  bcStamp?: boolean;
  size?: keyof typeof sizeClasses;
  /** Makes the card selectable, with a check on the photo when selected. */
  selection?: { selected: boolean; onSelectedChange: (selected: boolean) => void };
  /** The ⋯ menu beside the name. */
  menu?: MenuProps;
  disabled?: boolean;
};

/** One clothing piece: its photo on white, a name, and an optional detail line. */
export function ItemCard({
  name,
  detail,
  src,
  bcStamp = false,
  size = "md",
  selection,
  menu,
  disabled = false,
}: ItemCardProps) {
  const {
    card,
    photo,
    name: nameClasses,
    stamp: stampClasses,
    checkBox,
    checkIconSize,
  } = sizeClasses[size];

  const selected = selection?.selected ?? false;

  return (
    <Box
      className={`group relative flex flex-col gap-xs text-primary ${card} ${disabled ? "opacity-disabled-item" : ""}`}
    >
      <Box className={`relative w-full shrink-0 bg-card ${photo}`}>
        <CardImage src={src} fit="contain" className="size-full" />
        {!disabled && <CardWash />}
        {selected && <CardSelectedRing />}
        {bcStamp && (
          <img
            src={stamp}
            alt=""
            className={`absolute right-xs top-xs mix-blend-multiply ${stampClasses}`}
          />
        )}
        {selected && (
          <CardCheckBox checked iconSize={checkIconSize} className={`left-xs top-xs ${checkBox}`} />
        )}
      </Box>
      {selection && (
        <CardSelectCover
          label={name}
          pressed={selected}
          onPressedChange={selection.onSelectedChange}
          disabled={disabled}
        />
      )}
      <CardFooter menu={menu} className="gap-xxs">
        <Box className={nameClasses}>{name}</Box>
        {detail && <Box className="text-body-s text-secondary">{detail}</Box>}
      </CardFooter>
      {!disabled && <CardHoverOutline />}
    </Box>
  );
}
