import { createFileRoute, redirect } from "@tanstack/react-router";

import { AccountError, hasAccountQuery } from "../../account";

export const Route = createFileRoute("/_signedIn/_hasAccount")({
  beforeLoad: async ({ context }) => {
    if (!(await context.queryClient.ensureQueryData(hasAccountQuery(context.userId)))) {
      throw redirect({ to: "/create-account", replace: true });
    }
  },
  errorComponent: AccountError,
});
