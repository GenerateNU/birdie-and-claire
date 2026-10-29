import { createFileRoute } from "@tanstack/react-router";

import { AccountError, requireAccountStatus } from "@/account";

export const Route = createFileRoute("/_signedIn/_onboarded")({
  beforeLoad: ({ context }) => requireAccountStatus(context, ["ready"]),
  errorComponent: AccountError,
});
