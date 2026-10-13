import { Button as BaseButton } from "@base-ui/react/button";
import type { MouseEventHandler } from "react";
import {
  buttonBaseClasses,
  buttonSizeClasses,
  buttonVariantClasses,
  type ButtonVariant,
} from "./variant";

type ButtonProps = {
  label: string;
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
  const classes = className ? `${buttonClasses} ${className}` : buttonClasses;

  return (
    <BaseButton
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={classes}
    >
      {loading ? loadingLabel : label}
    </BaseButton>
  );
}
