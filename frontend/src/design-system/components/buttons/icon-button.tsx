import { Button as BaseButton } from "@base-ui/react/button";
import type { Icon } from "@phosphor-icons/react";
import type { MouseEventHandler, Ref } from "react";
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

type IconButtonProps = {
  ref?: Ref<HTMLButtonElement>;
  icon: Icon;
  /** The button's accessible name, since it shows no text. */
  label: string;
  variant?: Exclude<ButtonVariant, "destructive">;
  size?: ButtonSize;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
  className?: string;
};

export function IconButton({
  ref,
  icon: ButtonIcon,
  label,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  title,
  className,
}: IconButtonProps) {
  const buttonClasses = `${iconButtonBaseClasses} ${buttonVariantClasses[variant]} ${iconButtonSizeClasses[size]}`;

  return (
    <BaseButton
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={joinClasses(buttonClasses, className)}
    >
      <ButtonIcon size={iconButtonIconSize[size]} aria-hidden="true" />
    </BaseButton>
  );
}
