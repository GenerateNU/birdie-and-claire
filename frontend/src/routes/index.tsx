import { createFileRoute } from "@tanstack/react-router";

import { AccountError, getAccountStatus, requireAccountStatus } from "@/features/account/account";
import { Home } from "@/features/home/home";
import { Landing } from "@/features/landing/landing";
import { supabase } from "@/lib/supabase";

// Public, but a signed-in user still goes through requireAccountStatus's redirects.
export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { signedIn: false, onboarded: false };
    }

    // Someone partway through onboarding can land here from its X. The landing's links lead to
    // onboarded-only pages, whose guard sends them back to finish.
    await requireAccountStatus({ queryClient: context.queryClient, userId: session.user.id }, [
      "onboarded",
      "needs-preferences",
    ]);

    // Cached by the guard above, so this is no new request.
    const status = await getAccountStatus({
      queryClient: context.queryClient,
      userId: session.user.id,
    });

    return { signedIn: true, onboarded: status === "onboarded" };
  },
  errorComponent: AccountError,
  component: IndexPage,
});

function IndexPage() {
  const { signedIn, onboarded } = Route.useRouteContext();

  return onboarded ? <Home /> : <Landing signedIn={signedIn} />;
}
