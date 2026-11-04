import { Circle } from "@phosphor-icons/react";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Box, Link, Logo } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_onboarded/profile")({
  component: ProfileLayout,
});

const TABS = [
  { label: "Pieces I Own", to: "/profile/pieces" },
  { label: "Saved Outfits", to: "/profile/outfits" },
  { label: "Settings", to: "/profile/settings" },
] as const;

function ProfileLayout() {
  return (
    <Box className="flex min-h-screen flex-col lg:flex-row">
      <nav className="flex shrink-0 flex-col border-b px-xxl pb-lg pt-xxl lg:sticky lg:top-0 lg:h-screen lg:w-1/4 lg:border-b-0 lg:border-r lg:pb-0">
        <Link to="/">
          <Logo className="w-full max-w-xs" />
        </Link>
        <ul className="mt-xxl flex flex-col gap-lg">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <Link to={tab.to} className="flex items-center justify-between text-subheading">
                {({ isActive }) => (
                  <>
                    {tab.label}
                    <Circle aria-hidden="true" weight={isActive ? "fill" : "regular"} />
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="min-w-0 flex-1 p-xxl">
        <Outlet />
      </main>
    </Box>
  );
}
