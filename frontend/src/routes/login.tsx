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
        code={flow.code}
        onCodeChange={flow.changeCode}
        codeError={flow.codeError}
        resendSecondsLeft={flow.resendSecondsLeft}
        resendError={flow.resendError}
        busy={flow.busy}
        onResend={() => void flow.resendCode()}
        onSubmit={flow.verifyCode}
        onChangeEmail={flow.changeEmail}
      />
    );
  }

  if (flow.step === "signup") {
    return (
      <SignupScreen
        name={flow.name}
        onNameChange={flow.setName}
        email={flow.email}
        onEmailChange={flow.setEmail}
        busy={flow.busy}
        onSubmit={flow.sendCode}
        onBack={flow.backToChoice}
      />
    );
  }

  if (flow.step === "login-email") {
    return (
      <LoginEmailScreen
        email={flow.email}
        onEmailChange={flow.setEmail}
        busy={flow.busy}
        onSubmit={flow.sendCode}
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
