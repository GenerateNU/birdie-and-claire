import { Button as BaseButton } from "@base-ui/react/button";
import type { Icon } from "@phosphor-icons/react";
import type { MouseEventHandler } from "react";
import { joinClasses } from "@/design-system/utils/join-classes";

const iconButtonBaseClasses =
  "inline-flex items-center justify-center focus-ring data-[disabled]:opacity-disabled";

const iconButtonVariantClasses = {
  outlined: "size-avatar-md rounded-full border bg-background text-subheading",
  plain: "text-heading text-secondary",
} as const;

type IconButtonProps = {
  icon: Icon;
  /** The button's accessible name, since it shows no text. */
  label: string;
  variant: keyof typeof iconButtonVariantClasses;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
  className?: string;
};

export function IconButton({
  icon: ButtonIcon,
  label,
  variant,
  onClick,
  disabled = false,
  title,
  className,
}: IconButtonProps) {
  const buttonClasses = `${iconButtonBaseClasses} ${iconButtonVariantClasses[variant]}`;

  return (
    <BaseButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={joinClasses(buttonClasses, className)}
    >
      <ButtonIcon aria-hidden="true" />
    </BaseButton>
  );
}
