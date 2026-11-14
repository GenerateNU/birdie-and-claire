import { Button as BaseButton } from "@base-ui/react/button";
import type { Icon } from "@phosphor-icons/react";
import type { LinkProps } from "@tanstack/react-router";

import { Link } from "@/design-system/components/links/link";
import { Logo } from "@/design-system/components/logo/logo";

// tracking-wider is the lofi nav's 0.05em; the type tokens have no letter-spacing.
const itemBaseClasses =
  "inline-flex items-center gap-xs border-b-thick pb-xxs text-subheading font-normal uppercase tracking-wider focus-ring motion-safe:transition-colors";

const activeItemClasses = `${itemBaseClasses} border-primary`;

// The transparent border keeps inactive items the same height as the underlined one.
const inactiveItemClasses = `${itemBaseClasses} border-transparent`;

type HeaderItem = { label: string; icon: Icon } & (
  | { to: LinkProps["to"] }
  | { onClick: () => void; active: boolean }
);

type HeaderProps = {
  onLogoClick: () => void;
  items: HeaderItem[];
};

export function Header({ onLogoClick, items }: HeaderProps) {
  return (
    <header className="flex flex-col items-start gap-md border-b px-md py-lg lg:flex-row lg:px-xxxl lg:items-center lg:justify-between">
      <BaseButton type="button" onClick={onLogoClick} className="w-full max-w-xs focus-ring">
        <Logo className="w-full" />
      </BaseButton>
      <nav aria-label="Main">
        <ul className="flex flex-wrap items-center gap-x-xl gap-y-sm">
          {items.map((item) => (
            <li key={item.label}>
              <NavItem item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

type NavItemProps = {
  item: HeaderItem;
};

function NavItem({ item }: NavItemProps) {
  if ("to" in item) {
    return (
      <Link to={item.to} trailingIcon={item.icon} className={inactiveItemClasses}>
        {item.label}
      </Link>
    );
  }

  const ItemIcon = item.icon;

  return (
    <BaseButton
      type="button"
      onClick={item.onClick}
      aria-current={item.active ? "true" : undefined}
      className={item.active ? activeItemClasses : inactiveItemClasses}
    >
      {item.label}
      <ItemIcon aria-hidden="true" />
    </BaseButton>
  );
}
