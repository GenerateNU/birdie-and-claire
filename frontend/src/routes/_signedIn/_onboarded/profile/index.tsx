import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_signedIn/_onboarded/profile/")({
  beforeLoad: () => {
    // Saved Outfits is the only tab with real content; Pieces I Own is still a stub.
    throw redirect({ to: "/profile/outfits", replace: true });
  },
});
