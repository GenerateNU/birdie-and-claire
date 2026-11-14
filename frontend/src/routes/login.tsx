import { createFileRoute } from "@tanstack/react-router";

import { ChoiceScreen } from "@/features/auth/choice-screen";
import { LoginEmailScreen } from "@/features/auth/login-email-screen";
import { SignupScreen } from "@/features/auth/signup-screen";
import { useAuthFlow } from "@/features/auth/use-auth-flow";
import { VerifiedScreen } from "@/features/auth/verified-screen";
import { VerifyScreen } from "@/features/auth/verify-screen";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const flow = useAuthFlow();

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
