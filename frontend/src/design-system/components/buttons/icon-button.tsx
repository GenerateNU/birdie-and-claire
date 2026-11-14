import { Button as BaseButton } from "@base-ui/react/button";
import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ComponentProps } from "react";
import {
  buttonVariantClasses,
  type ButtonSize,
  type ButtonVariant,
} from "@/design-system/components/buttons/variant";
import { joinClasses } from "@/design-system/utils/join-classes";

const iconButtonBaseClasses = "inline-flex items-center justify-center rounded-none focus-ring";

// Square like Figma's Icon Button, the same heights as Button.
const iconButtonSizeClasses = {
  md: "size-xxl",
  sm: "size-xl",
} as const;

const iconButtonIconSize = { md: 20, sm: 16 } as const;

// The rest of the props reach the button, so a Base UI part can render this as its trigger.
type IconButtonProps = Omit<
  ComponentProps<typeof BaseButton>,
  "children" | "className" | "type" | "aria-label"
> & {
  icon: Icon;
  /** The button's accessible name, since it shows no text. */
  label: string;
  variant?: Exclude<ButtonVariant, "destructive">;
  size?: ButtonSize;
  className?: string;
};

export function IconButton({
  icon: ButtonIcon,
  label,
  variant = "primary",
  size = "md",
  className,
  ...buttonProps
}: IconButtonProps) {
  const buttonClasses = `${iconButtonBaseClasses} ${buttonVariantClasses[variant]} ${iconButtonSizeClasses[size]}`;

  return (
    <BaseButton
      render={<motion.button whileTap={{ scale: 0.95 }} />}
      type="button"
      aria-label={label}
      className={joinClasses(buttonClasses, className)}
      {...buttonProps}
    >
      <ButtonIcon size={iconButtonIconSize[size]} aria-hidden="true" />
    </BaseButton>
  );
}
