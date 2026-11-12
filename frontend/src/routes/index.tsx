import { createFileRoute } from "@tanstack/react-router";

import { requireAccountStatus } from "@/features/account/account";
import { Landing } from "@/features/landing/landing";
import { supabase } from "@/lib/supabase";

// Public, but a signed-in user still goes through requireAccountStatus's redirects.
export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { signedIn: false };
    }

    await requireAccountStatus({ queryClient: context.queryClient, userId: session.user.id }, [
      "onboarded",
    ]);

    return { signedIn: true };
  },
  component: Home,
});

function Home() {
  const { signedIn } = Route.useRouteContext();

  return <Landing signedIn={signedIn} />;
}
