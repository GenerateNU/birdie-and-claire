import { Button as BaseButton } from "@base-ui/react/button";
import type { Icon } from "@phosphor-icons/react";
import type { LinkProps } from "@tanstack/react-router";

import { Link } from "@/design-system/components/links/link";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

const navItemBaseClasses = "relative flex items-center whitespace-nowrap text-left focus-ring";

const levelClasses = {
  main: "h-xxl w-full gap-xs px-sm",
  sub: "h-xl w-full gap-sm pl-xxl pr-sm",
  collapsed: "size-xxl justify-center",
} as const;

// An active row keeps its fill on hover, so the two never look alike. A sub row has no fill at all,
// only the tick.
function stateClasses(level: keyof typeof levelClasses, active: boolean) {
  if (active) {
    return level === "sub"
      ? "text-label-l-strong text-primary"
      : "bg-surface text-label-l-strong text-primary";
  }

  return level === "sub"
    ? "text-label-l text-secondary hover:bg-hover"
    : "text-label-l text-secondary hover:bg-hover hover:text-primary";
}

export type NavTarget = { to: LinkProps["to"] } | { onClick: () => void };

type NavItemCommon = {
  label: string;
  /** Marks the row for the current screen. */
  active?: boolean;
  className?: string;
} & NavTarget;

export type NavItemProps = NavItemCommon &
  (
    | { level?: "main" | "collapsed"; icon: Icon }
    // A sub item is indented text under a main item.
    | { level: "sub"; icon?: undefined }
  );

/**
 * One sidebar row. A collapsed row shows only its icon, so it carries the label as its accessible
 * name and a native tooltip.
 */
export function NavItem(props: NavItemProps) {
  const { label, active = false, level = "main", className } = props;
  const ItemIcon = props.icon;
  const collapsed = level === "collapsed";

  const classes = joinClasses(
    `${navItemBaseClasses} ${levelClasses[level]} ${stateClasses(level, active)}`,
    className,
  );

  const collapsedProps = collapsed ? { "aria-label": label, title: label } : {};

  const content = (
    <>
      {ItemIcon && <ItemIcon size={20} aria-hidden="true" />}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {level === "sub" &&
        active && (
          // Figma places the 2px tick 21px from the row's left edge.
          <Box className="absolute left-[1.3125rem] top-xs h-md border-l-thick border-primary" />
        )}
    </>
  );

  if ("to" in props) {
    return (
      <Link
        to={props.to}
        aria-current={active ? "page" : undefined}
        className={classes}
        {...collapsedProps}
      >
        {content}
      </Link>
    );
  }

  return (
    <BaseButton
      type="button"
      onClick={props.onClick}
      aria-current={active ? "page" : undefined}
      className={classes}
      {...collapsedProps}
    >
      {content}
    </BaseButton>
  );
}
