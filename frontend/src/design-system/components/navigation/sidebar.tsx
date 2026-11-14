import { ArrowRightIcon, PlusIcon, SidebarSimpleIcon, type Icon } from "@phosphor-icons/react";
import type { LinkProps } from "@tanstack/react-router";

import stamp from "@/design-system/assets/stamp.png";
import { Button } from "@/design-system/components/buttons/button";
import { IconButton } from "@/design-system/components/buttons/icon-button";
import { Link } from "@/design-system/components/links/link";
import { Logo } from "@/design-system/components/logo/logo";
import { NavItem, type NavTarget } from "@/design-system/components/navigation/nav-item";
import { Box } from "@/design-system/primitives/box";
import { Divider } from "@/design-system/primitives/divider";

type SubItem = { label: string; active?: boolean } & NavTarget;

type SidebarItem = {
  label: string;
  icon: Icon;
  active?: boolean;
  /** Shown indented under the item while the sidebar is expanded. Leave out to keep it closed. */
  subItems?: SubItem[];
} & NavTarget;

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Where the logo goes. */
  logoTo: LinkProps["to"];
  /** The primary button under the logo, such as New outfit. */
  action: { label: string; onClick: () => void };
  items: SidebarItem[];
  /** A second group, pinned to the bottom above the account. */
  secondaryItems: SidebarItem[];
  account: { name: string; detail: string; to: LinkProps["to"] };
};

/** Home-base navigation. Expanded shows labels, collapsed only icons. Fills its parent's height. */
export function Sidebar({
  collapsed,
  onToggleCollapsed,
  logoTo,
  action,
  items,
  secondaryItems,
  account,
}: SidebarProps) {
  return (
    <nav
      aria-label="Sidebar"
      className={`flex h-full flex-col gap-lg border-r bg-background px-md py-lg ${
        collapsed ? "w-sidebar-collapsed items-center" : "w-sidebar"
      }`}
    >
      <Box
        className={
          collapsed
            ? "flex flex-col items-center gap-sm"
            : "flex items-center justify-between gap-sm pl-sm pr-xxs"
        }
      >
        <Link to={logoTo} className="focus-ring">
          {collapsed ? (
            <img src={stamp} alt="Birdie & Claire" className="size-xxl mix-blend-multiply" />
          ) : (
            <Logo className="h-logo-sidebar w-logo-sidebar object-cover object-bottom" />
          )}
        </Link>
        <IconButton
          icon={SidebarSimpleIcon}
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          variant="ghost"
          size="sm"
          onClick={onToggleCollapsed}
        />
      </Box>

      {collapsed ? (
        <IconButton icon={PlusIcon} label={action.label} onClick={action.onClick} />
      ) : (
        <Button
          label={action.label}
          leadingIcon={PlusIcon}
          onClick={action.onClick}
          className="w-full"
        />
      )}

      <SidebarGroup items={items} collapsed={collapsed} />

      <Box className="mt-auto flex w-full flex-col gap-lg">
        <SidebarGroup items={secondaryItems} collapsed={collapsed} />
        <Divider className="w-full" />
        <AccountLink account={account} collapsed={collapsed} />
      </Box>
    </nav>
  );
}

type SidebarGroupProps = {
  items: SidebarItem[];
  collapsed: boolean;
};

function SidebarGroup({ items, collapsed }: SidebarGroupProps) {
  return (
    <ul className="flex w-full flex-col gap-xxs">
      {items.map(({ subItems, ...item }) => (
        <li key={item.label}>
          <NavItem {...item} level={collapsed ? "collapsed" : "main"} />
          {!collapsed && subItems && (
            <ul className="mt-xxs flex flex-col gap-xxs">
              {subItems.map((subItem) => (
                <li key={subItem.label}>
                  <NavItem {...subItem} level="sub" />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

type AccountLinkProps = {
  account: SidebarProps["account"];
  collapsed: boolean;
};

function AccountLink({ account, collapsed }: AccountLinkProps) {
  const { name, detail, to } = account;

  return (
    <Link
      to={to}
      aria-label={collapsed ? `${name}, ${detail}` : undefined}
      title={collapsed ? name : undefined}
      className={`flex items-center gap-sm focus-ring ${collapsed ? "" : "px-sm"}`}
    >
      <Box className="flex size-xl shrink-0 items-center justify-center bg-surface text-label-l-strong uppercase">
        {name.charAt(0)}
      </Box>
      {!collapsed && (
        <>
          <Box className="flex min-w-0 flex-1 flex-col">
            <Box className="truncate text-label-l-strong">{name}</Box>
            <Box className="truncate text-body-s text-secondary">{detail}</Box>
          </Box>
          <ArrowRightIcon size={16} aria-hidden="true" />
        </>
      )}
    </Link>
  );
}
