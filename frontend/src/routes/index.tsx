import { createFileRoute } from "@tanstack/react-router";

import { AccountError, requireAccountStatus } from "@/features/account/account";
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
  errorComponent: AccountError,
  component: LandingPage,
});

function LandingPage() {
  const { signedIn } = Route.useRouteContext();

  return <Landing signedIn={signedIn} />;
}
