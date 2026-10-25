import { Button as BaseButton } from "@base-ui/react/button";
import type { MouseEventHandler } from "react";
import {
  buttonBaseClasses,
  buttonSizeClasses,
  buttonVariantClasses,
  type ButtonVariant,
} from "./variant";
import { joinClasses } from "../../utils/join-classes";

type ButtonProps = {
  label: string;
  accessibleLabel?: string;
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizeClasses;
  loading?: boolean;
  loadingLabel?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
};

export function Button({
  label,
  accessibleLabel,
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Loading…",
  onClick,
  type = "button",
  disabled = false,
  className,
}: ButtonProps) {
  const buttonClasses = `${buttonBaseClasses} ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]}`;
  const classes = joinClasses(buttonClasses, className);

  return (
    <BaseButton
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      // While loading, the visible loadingLabel is the name, so accessibleLabel steps aside.
      aria-label={loading ? undefined : accessibleLabel}
      className={classes}
    >
      {loading ? loadingLabel : label}
    </BaseButton>
  );
}
