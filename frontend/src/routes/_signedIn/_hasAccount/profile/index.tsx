import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_signedIn/_hasAccount/profile/")({
  beforeLoad: () => {
    throw redirect({ to: "/profile/outfits", replace: true });
  },
});
