import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_signedIn/_onboarded/_nav/profile")({
  component: ProfileLayout,
});

function ProfileLayout() {
  return (
    <main className="p-xxxl">
      <Outlet />
    </main>
  );
}
