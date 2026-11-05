import { Button as BaseButton } from "@base-ui/react/button";
import type { Icon } from "@phosphor-icons/react";
import type { MouseEventHandler } from "react";
import {
  buttonBaseClasses,
  buttonSizeClasses,
  buttonVariantClasses,
  type ButtonVariant,
} from "@/design-system/components/buttons/variant";
import { joinClasses } from "@/design-system/utils/join-classes";

type ButtonProps = {
  label: string;
  accessibleLabel?: string;
  leadingIcon?: Icon;
  trailingIcon?: Icon;
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
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Loading…",
  onClick,
  type = "button",
  disabled = false,
  className,
}: ButtonProps) {
  const hasIcon = LeadingIcon !== undefined || TrailingIcon !== undefined;
  const iconClasses = hasIcon ? " inline-flex items-center gap-xxs" : "";
  const buttonClasses = `${buttonBaseClasses} ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]}${iconClasses}`;
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
      {LeadingIcon && !loading && <LeadingIcon aria-hidden="true" />}
      {loading ? loadingLabel : label}
      {TrailingIcon && !loading && <TrailingIcon aria-hidden="true" />}
    </BaseButton>
  );
}
