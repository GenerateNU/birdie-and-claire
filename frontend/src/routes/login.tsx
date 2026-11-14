import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { ChoiceScreen } from "@/features/auth/choice-screen";
import { LoginEmailScreen } from "@/features/auth/login-email-screen";
import { forgetReturnPath, rememberReturnPath } from "@/features/auth/return-path";
import { SignupScreen } from "@/features/auth/signup-screen";
import { useAuthFlow } from "@/features/auth/use-auth-flow";
import { VerifiedScreen } from "@/features/auth/verified-screen";
import { VerifyScreen } from "@/features/auth/verify-screen";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const flow = useAuthFlow();

  useEffect(() => {
    if (redirect === undefined) {
      // A plain visit must not reuse a return path from an earlier login attempt.
      forgetReturnPath();
    } else {
      rememberReturnPath(redirect);
    }
  }, [redirect]);

  if (flow.step === "verified") {
    return <VerifiedScreen />;
  }

  if (flow.step === "verify") {
    return (
      <VerifyScreen
        email={flow.email}
        onVerified={flow.finishVerification}
        onChangeEmail={flow.changeEmail}
      />
    );
  }

  if (flow.step === "signup") {
    return (
      <SignupScreen
        defaultName={flow.name}
        defaultEmail={flow.email}
        sending={flow.sendingCode}
        onSubmit={flow.sendSignupCode}
        onBack={flow.backToChoice}
      />
    );
  }

  if (flow.step === "login-email") {
    return (
      <LoginEmailScreen
        defaultEmail={flow.email}
        sending={flow.sendingCode}
        onSubmit={flow.sendLoginCode}
        onBack={flow.backToChoice}
      />
    );
  }

  return (
    <ChoiceScreen
      onLogIn={() => flow.choosePath("login")}
      onSignUp={() => flow.choosePath("signup")}
    />
  );
}
