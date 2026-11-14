import { createFileRoute, redirect } from "@tanstack/react-router";

import { AccountError, requireAccountStatus } from "@/features/account/account";
import { takeReturnPath } from "@/features/auth/return-path";
import { Landing } from "@/features/landing/landing";
import { supabase } from "@/lib/supabase";

// Public, but a signed-in user still goes through requireAccountStatus's redirects. Every sign-in
// path ends here once the user is onboarded, so this is where a remembered return path is followed.
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

    const returnPath = takeReturnPath();

    if (returnPath !== null) {
      throw redirect({ href: returnPath, replace: true });
    }

    return { signedIn: true };
  },
  errorComponent: AccountError,
  component: LandingPage,
});

function LandingPage() {
  const { signedIn } = Route.useRouteContext();

  return <Landing signedIn={signedIn} />;
}
