import { createFileRoute, redirect } from "@tanstack/react-router";

import { AccountError, hasAccountQuery } from "../../account";

export const Route = createFileRoute("/_signedIn/_hasAccount")({
  beforeLoad: async ({ context }) => {
    const hasAccount = await context.queryClient.query(hasAccountQuery(context.userId));

    if (!hasAccount) {
      throw redirect({ to: "/create-account", replace: true });
    }
  },
  errorComponent: AccountError,
});
