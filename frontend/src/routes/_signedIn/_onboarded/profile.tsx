import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import logo from "@/assets/logo.png";

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
    <div className="flex min-h-screen flex-col bg-background font-sans text-primary lg:flex-row">
      <nav className="flex shrink-0 flex-col border-b px-xxl pb-lg pt-xxl lg:sticky lg:top-0 lg:h-screen lg:w-1/4 lg:border-b-0 lg:border-r lg:pb-0">
        <Link to="/">
          <img src={logo} alt="Birdie & Claire" className="w-full max-w-xs" />
        </Link>
        <ul className="mt-xxl flex flex-col gap-lg">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <Link to={tab.to} className="flex items-center justify-between text-subheading">
                {({ isActive }) => (
                  <>
                    {tab.label}
                    <span
                      aria-hidden="true"
                      className={`size-sm rounded-full border border-current ${isActive ? "bg-current" : ""}`}
                    />
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
    </div>
  );
}
