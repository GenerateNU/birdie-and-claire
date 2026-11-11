import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type SyntheticEvent } from "react";

import { createCurrentUserMutation } from "@/api/generated/@tanstack/react-query.gen";
import { useToast } from "@/design-system";
import { ChoiceScreen } from "@/features/auth/choice-screen";
import { LoginEmailScreen } from "@/features/auth/login-email-screen";
import { SignupScreen } from "@/features/auth/signup-screen";
import { VerifiedScreen } from "@/features/auth/verified-screen";
import { VerifyScreen } from "@/features/auth/verify-screen";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  component: Login,
});

type Step = "choice" | "login-email" | "signup" | "verify" | "verified";

// Which path reached the verify step, so "Change the email address" returns to the right screen.
type Mode = "login" | "signup";

// Supabase's default minimum time between codes sent to one address; an earlier resend is refused.
const RESEND_COUNTDOWN_SECONDS = 60;

const VERIFIED_REDIRECT_MS = 2000;

// The error codes Supabase answers with when a code was requested too soon after the last one.
const RATE_LIMIT_CODES = ["over_email_send_rate_limit", "over_request_rate_limit"];

function Login() {
  const toast = useToast();
  const navigate = useNavigate();
  const createAccountMutation = useMutation(createCurrentUserMutation());
  const [step, setStep] = useState<Step>("choice");
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeRejected, setCodeRejected] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  useEffect(() => {
    if (step !== "verify" || resendSecondsLeft === 0) {
      return;
    }

    const timer = setTimeout(() => setResendSecondsLeft(resendSecondsLeft - 1), 1000);

    return () => clearTimeout(timer);
  }, [step, resendSecondsLeft]);

  useEffect(() => {
    if (step !== "verified") {
      return;
    }

    // Lands on / so the _onboarded route decides where the user goes: home, /create-account if
    // they have no account yet, or onboarding if they haven't finished it.
    const timer = setTimeout(() => window.location.assign("/"), VERIFIED_REDIRECT_MS);

    return () => clearTimeout(timer);
  }, [step]);

  function choosePath(nextMode: Mode) {
    setMode(nextMode);
    setStep(nextMode === "login" ? "login-email" : "signup");
  }

  function clearCode() {
    setCode("");
    setCodeRejected(false);
    setResendError(null);
  }

  async function sendCode(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    const { error } = await supabase.auth.signInWithOtp({ email });

    setBusy(false);

    if (error) {
      toast.show({ message: "Couldn't send the code. Try again." });

      return;
    }

    clearCode();
    setResendSecondsLeft(RESEND_COUNTDOWN_SECONDS);
    setStep("verify");
  }

  async function resendCode() {
    setResendError(null);
    setBusy(true);

    const { error } = await supabase.auth.signInWithOtp({ email });

    setBusy(false);

    if (error) {
      setResendError(
        RATE_LIMIT_CODES.includes(error.code ?? "")
          ? "Please wait a moment before asking for a new code."
          : "Couldn't send a new code. Try again.",
      );

      return;
    }

    // The new code replaces the old one, so digits already typed can only fail.
    clearCode();
    setResendSecondsLeft(RESEND_COUNTDOWN_SECONDS);
    toast.show({ message: "New code sent" });
  }

  function changeEmail() {
    clearCode();
    setStep(mode === "login" ? "login-email" : "signup");
  }

  function typeCode(next: string) {
    setCode(next);
    setCodeRejected(false);
  }

  async function verifyCode(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });

    setBusy(false);

    // Supabase answers a wrong code and an expired one the same way.
    if (error?.code === "otp_expired") {
      setCode("");
      setCodeRejected(true);

      return;
    }

    if (error) {
      toast.show({ message: "Couldn't verify the code. Try again." });

      return;
    }

    if (mode === "signup") {
      createAccount();

      return;
    }

    setStep("verified");
  }

  // Runs after the code is verified, so the request carries the new session.
  function createAccount() {
    setBusy(true);
    createAccountMutation.mutate(
      { body: { name } },
      {
        onSuccess: () => setStep("verified"),
        onError: async (error) => {
          if (error.status === 409) {
            toast.show({ message: "You already have an account, so we signed you in." });
            setStep("verified");

            return;
          }

          toast.show({ message: "Couldn't create your account, please enter your name again" });
          // A router navigation, not a page load, so the toast stays on screen.
          await navigate({ to: "/create-account" });
        },
        onSettled: () => setBusy(false),
      },
    );
  }

  if (step === "verified") {
    return <VerifiedScreen />;
  }

  if (step === "verify") {
    return (
      <VerifyScreen
        email={email}
        code={code}
        onCodeChange={typeCode}
        codeRejected={codeRejected}
        resendSecondsLeft={resendSecondsLeft}
        resendError={resendError}
        busy={busy}
        onResend={() => void resendCode()}
        onSubmit={verifyCode}
        onChangeEmail={changeEmail}
      />
    );
  }

  if (step === "signup") {
    return (
      <SignupScreen
        name={name}
        onNameChange={setName}
        email={email}
        onEmailChange={setEmail}
        busy={busy}
        onSubmit={sendCode}
        onBack={() => setStep("choice")}
      />
    );
  }

  if (step === "login-email") {
    return (
      <LoginEmailScreen
        email={email}
        onEmailChange={setEmail}
        busy={busy}
        onSubmit={sendCode}
        onBack={() => setStep("choice")}
      />
    );
  }

  return <ChoiceScreen onLogIn={() => choosePath("login")} onSignUp={() => choosePath("signup")} />;
}
