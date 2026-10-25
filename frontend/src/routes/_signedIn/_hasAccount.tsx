import { createFileRoute, redirect } from "@tanstack/react-router";

import { AccountError, accountStatusQuery } from "@/account";

export const Route = createFileRoute("/_signedIn/_hasAccount")({
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.query(accountStatusQuery(context.userId));

    if (status === "none") {
      throw redirect({ to: "/create-account", replace: true });
    }

    if (status === "needs-preferences") {
      throw redirect({ to: "/onboarding", replace: true });
    }
  },
  errorComponent: AccountError,
});
