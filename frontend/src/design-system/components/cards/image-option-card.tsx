import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { motion } from "motion/react";

import { CardImage } from "@/design-system/components/cards/card-image";
import {
  CardCheckBox,
  CardHoverOutline,
  CardSelectedRing,
  CardWash,
} from "@/design-system/components/cards/card-parts";
import { Box } from "@/design-system/primitives/box";

// fill takes the width its container gives it.
const sizeClasses = {
  fill: { card: "", photo: "aspect-portrait", title: "text-heading-s" },
  sm: { card: "w-card-sm", photo: "h-card-sm", title: "text-label-l-strong" },
  lg: { card: "w-card-lg", photo: "h-card-lg", title: "text-heading-s" },
};

type ImageOptionCardProps = {
  label: string;
  subtitle?: string;
  src: string | null;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  size?: keyof typeof sizeClasses;
  /** `multi` marks the card with a checkbox in its top-right corner. */
  selection?: "single" | "multi";
  disabled?: boolean;
};

/** A photo you choose, with a title and an optional subtitle. Has no frame of its own. */
export function ImageOptionCard({
  label,
  subtitle,
  src,
  pressed,
  onPressedChange,
  size = "fill",
  selection = "single",
  disabled = false,
}: ImageOptionCardProps) {
  const { card, photo, title } = sizeClasses[size];
  const stateClasses = disabled ? "text-disabled" : "cursor-pointer text-primary";

  return (
    <BaseToggle
      render={<motion.button whileTap={{ scale: 0.98 }} />}
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      className={`group relative flex flex-col gap-sm text-left focus-ring ${stateClasses} ${card}`}
    >
      <Box className={`relative w-full shrink-0 ${photo}`}>
        <CardImage src={src} className={`size-full ${disabled ? "opacity-disabled" : ""}`} />
        {!disabled && <CardWash />}
        {pressed && <CardSelectedRing />}
        {selection === "multi" && (pressed || !disabled) && (
          <CardCheckBox
            checked={pressed}
            hoverOnly
            iconSize={14}
            className="right-xs top-xs size-lg border-medium"
          />
        )}
      </Box>
      <Box className="flex w-full flex-col gap-xxs break-words">
        <Box className={title}>{label}</Box>
        {subtitle && (
          <Box className={`text-body-s ${disabled ? "" : "text-secondary"}`}>{subtitle}</Box>
        )}
      </Box>
      {!disabled && <CardHoverOutline />}
    </BaseToggle>
  );
}
