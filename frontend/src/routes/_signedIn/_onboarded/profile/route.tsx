import { BookmarkSimpleIcon, CoatHangerIcon, UserIcon } from "@phosphor-icons/react";
import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";

import { Box, Link, Logo, NavItem } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_onboarded/profile")({
  component: ProfileLayout,
});

const TABS = [
  {
    label: "Pieces I Own",
    to: "/profile/pieces",
    icon: CoatHangerIcon,
    activeOn: ["/profile/pieces"],
  },
  {
    label: "Saved Outfits",
    to: "/profile/outfits",
    icon: BookmarkSimpleIcon,
    activeOn: ["/profile/outfits", "/profile/collections"],
  },
  { label: "Settings", to: "/profile/settings", icon: UserIcon, activeOn: ["/profile/settings"] },
] as const;

function ProfileLayout() {
  const matchRoute = useMatchRoute();

  return (
    <Box className="flex min-h-screen flex-col lg:flex-row">
      <nav className="flex shrink-0 flex-col border-b px-xxxl pb-lg pt-xxxl lg:sticky lg:top-0 lg:h-screen lg:w-1/4 lg:border-b-0 lg:border-r lg:pb-0">
        <Link to="/">
          <Logo className="w-full max-w-xs" />
        </Link>
        <ul className="mt-xxxl flex flex-col gap-xxs">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavItem
                level="main"
                label={tab.label}
                icon={tab.icon}
                to={tab.to}
                // Fuzzy, so Style Preferences under Settings keeps Settings marked.
                active={tab.activeOn.some((to) => Boolean(matchRoute({ to, fuzzy: true })))}
              />
            </li>
          ))}
        </ul>
      </nav>
      <main className="min-w-0 flex-1 p-xxxl">
        <Outlet />
      </main>
    </Box>
  );
}
