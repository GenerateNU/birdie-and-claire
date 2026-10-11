import { Button as BaseButton } from "@base-ui/react/button";
import type { MouseEventHandler } from "react";
import { ButtonBase, ButtonSize, ButtonVariant } from "./variant";

type ButtonProps = {
  label: string;
  variant?: keyof typeof ButtonVariant;
  size?: keyof typeof ButtonSize;
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
  const variantClasses = `${ButtonBase} ${ButtonVariant[variant]} ${ButtonSize[size]}`;
  const classes = className ? `${variantClasses} ${className}` : variantClasses;

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
