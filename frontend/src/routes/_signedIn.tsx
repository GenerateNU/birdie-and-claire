import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/supabase/client";

export const Route = createFileRoute("/_signedIn")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/login", replace: true });
    }

    // Login is email OTP only, so a session without an email means something upstream broke.
    const email = session.user.email;

    if (!email) {
      throw new Error("signed-in user has no email");
    }

    return { userId: session.user.id, email };
  },
});
