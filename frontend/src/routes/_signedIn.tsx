import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "../supabase/client";

export const Route = createFileRoute("/_signedIn")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/login", replace: true });
    }

    return { userId: session.user.id };
  },
});
