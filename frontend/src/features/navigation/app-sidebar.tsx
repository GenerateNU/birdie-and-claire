import {
  ArrowSquareOutIcon,
  BookmarkSimpleIcon,
  CoatHangerIcon,
  HouseIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMatchRoute, useNavigate, type LinkProps } from "@tanstack/react-router";

import { getCurrentUserOptions } from "@/api/generated/@tanstack/react-query.gen";
import { Sidebar } from "@/design-system";

const STORE_URL = "https://birdieandclaire.com";

type AppSidebarItem = {
  label: string;
  icon: Icon;
  to: LinkProps["to"];
  /** The routes that mark this item, matched fuzzily so nested pages count. Empty never marks it. */
  activeOn: LinkProps["to"][];
};

const mainItems: AppSidebarItem[] = [
  // There's no signed-in home page yet, so Home opens the saved outfits, which already have their
  // own item.
  { label: "Home", icon: HouseIcon, to: "/profile/outfits", activeOn: [] },
  {
    label: "Saved outfits",
    icon: BookmarkSimpleIcon,
    to: "/profile/outfits",
    activeOn: ["/profile/outfits", "/outfits/$outfitId"],
  },
];

const myPiecesItem: AppSidebarItem = {
  label: "My pieces",
  icon: CoatHangerIcon,
  to: "/profile/pieces",
  activeOn: ["/profile/pieces"],
};

/** The signed-in app's navigation, beside every page that isn't a full-screen flow. */
export function AppSidebar() {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const nameQuery = useQuery({ ...getCurrentUserOptions(), select: (user) => user.name });

  function toSidebarItem({ label, icon, to, activeOn }: AppSidebarItem) {
    return {
      label,
      icon,
      to,
      active: activeOn.some((route) => Boolean(matchRoute({ to: route, fuzzy: true }))),
    };
  }

  return (
    <Sidebar
      collapse={null}
      logoTo="/profile/outfits"
      action={{ label: "New outfit", onClick: () => void navigate({ to: "/create-outfit" }) }}
      items={mainItems.map(toSidebarItem)}
      secondaryItems={[
        toSidebarItem(myPiecesItem),
        {
          label: "Shop Birdie & Claire",
          icon: ArrowSquareOutIcon,
          onClick: () => window.open(STORE_URL, "_blank", "noopener"),
        },
      ]}
      // The name fills in once the account loads.
      account={{ name: nameQuery.data ?? "", detail: "My account", to: "/profile/settings" }}
    />
  );
}
