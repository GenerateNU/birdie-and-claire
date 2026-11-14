import type { Icon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";

import { joinClasses } from "@/design-system/utils/join-classes";

const menuItemBaseClasses =
  "flex h-xxl w-full items-center gap-xs px-sm text-left text-label-l whitespace-nowrap";

// Base UI marks the row under the pointer or keyboard focus with data-highlighted, so one variant
// covers hover and arrow keys.
function menuItemStateClasses(destructive: boolean, disabled: boolean) {
  if (disabled) {
    return "text-disabled";
  }

  return destructive
    ? "text-error data-[highlighted]:bg-error-subtle"
    : "text-primary data-[highlighted]:bg-hover";
}

type MenuItemProps = Omit<ComponentProps<"button">, "children" | "className" | "disabled"> & {
  label: string;
  /** Shown 16px before the label. */
  icon?: Icon;
  /** Red text for an action that removes something. */
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
};

/** One row of a menu. Menu renders it inside Base UI's menu item, which supplies the behavior. */
export function MenuItem({
  label,
  icon: ItemIcon,
  destructive = false,
  disabled = false,
  className,
  ...buttonProps
}: MenuItemProps) {
  const classes = joinClasses(
    `${menuItemBaseClasses} ${menuItemStateClasses(destructive, disabled)}`,
    className,
  );

  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled}
      className={classes}
      {...buttonProps}
    >
      {ItemIcon && <ItemIcon size={16} aria-hidden="true" />}
      {label}
    </button>
  );
}
