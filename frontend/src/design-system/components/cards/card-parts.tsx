import { Button as BaseButton } from "@base-ui/react/button";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { CheckIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Menu, type MenuProps } from "@/design-system/components/menu/menu";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

// The overlays below mark themselves with data attributes so the playground can hold a hover look
// still. They rely on the card's root carrying `group` and `relative`, and they leave hover out of
// a disabled card by not being rendered.

/** The light outline around a hovered card. */
export function CardHoverOutline() {
  return (
    <Box
      data-card-hover
      aria-hidden="true"
      className="pointer-events-none absolute inset-card-hover border opacity-0 group-hover:opacity-100"
    />
  );
}

/** The wash over a hovered card's photo. Goes inside the photo. */
export function CardWash() {
  return (
    <Box
      data-card-wash
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-background opacity-0 group-hover:opacity-wash"
    />
  );
}

/** The ring around a selected card's photo, with a 4px gap. Goes inside the photo. */
export function CardSelectedRing() {
  return (
    <Box
      aria-hidden="true"
      className="pointer-events-none absolute inset-card-ring border-thick border-primary"
    />
  );
}

type CardCheckBoxProps = {
  checked: boolean;
  iconSize: number;
  /** Sets the box's size, position and border width. An unchecked box shows only on hover when
   * `hoverOnly` is set. */
  className: string;
  hoverOnly?: boolean;
};

/** A selection mark drawn on a photo. Only looks like a checkbox: the whole card is the control. */
export function CardCheckBox({
  checked,
  iconSize,
  className,
  hoverOnly = false,
}: CardCheckBoxProps) {
  const stateClasses = checked
    ? "border-primary bg-primary text-inverse"
    : "border-primary bg-card";

  const showOnHover = hoverOnly && !checked;
  const hoverClasses = showOnHover ? "opacity-0 group-hover:opacity-100" : "";

  return (
    <Box
      data-card-hover={showOnHover ? true : undefined}
      aria-hidden="true"
      className={`pointer-events-none absolute flex items-center justify-center ${stateClasses} ${hoverClasses} ${className}`}
    >
      {checked && <CheckIcon size={iconSize} />}
    </Box>
  );
}

type CardSelectCoverProps = {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  disabled?: boolean;
};

// A button stretched over the card, so the ⋯ menu can sit above it without nesting buttons. It
// must come after the photo in the DOM and before the menu, which are the other positioned parts.
const coverClasses = "absolute inset-0 focus-ring";

/** Makes the whole card a toggle. */
export function CardSelectCover({
  label,
  pressed,
  onPressedChange,
  disabled = false,
}: CardSelectCoverProps) {
  return (
    <BaseToggle
      aria-label={label}
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      className={`${coverClasses} ${disabled ? "" : "cursor-pointer"}`}
    />
  );
}

type CardOpenCoverProps = {
  label: string;
  onClick: () => void;
};

/** Makes the whole card a button that opens what it shows. */
export function CardOpenCover({ label, onClick }: CardOpenCoverProps) {
  return (
    <BaseButton
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${coverClasses} cursor-pointer`}
    />
  );
}

type CardFooterProps = {
  children: ReactNode;
  menu?: MenuProps;
  className?: string;
};

/** The text under a card's photo, with the ⋯ menu beside it. */
export function CardFooter({ children, menu, className }: CardFooterProps) {
  return (
    <Box className={joinClasses("flex items-start", className)}>
      <Box className="flex min-w-0 flex-1 flex-col gap-xxs break-words">{children}</Box>
      {menu && (
        <Box className="relative shrink-0">
          <Menu {...menu} />
        </Box>
      )}
    </Box>
  );
}
