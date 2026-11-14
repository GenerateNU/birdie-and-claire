import { createFileRoute } from "@tanstack/react-router";

import { AccountError, requireAccountStatus } from "@/features/account/account";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";

export const Route = createFileRoute("/_signedIn/onboarding")({
  beforeLoad: ({ context }) => requireAccountStatus(context, ["needs-preferences"]),
  errorComponent: AccountError,
  component: OnboardingFlow,
});
