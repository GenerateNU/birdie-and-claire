import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type SyntheticEvent } from "react";

import { createCurrentUserMutation } from "@/api/generated/@tanstack/react-query.gen";
import { useToast } from "@/design-system";
import { supabase } from "@/lib/supabase";

type Step = "choice" | "login-email" | "signup" | "verify" | "verified";

type AuthPath = "login" | "signup";

// Supabase's default minimum time between codes sent to one address; an earlier resend is refused.
const RESEND_COUNTDOWN_SECONDS = 60;

const VERIFIED_REDIRECT_MS = 2000;

// The error codes Supabase answers with when a code was requested too soon after the last one.
const RATE_LIMIT_CODES = ["over_email_send_rate_limit", "over_request_rate_limit"];

/** The login and sign-up flow: which step is showing, its fields, and what each action does. */
export function useAuthFlow() {
  const toast = useToast();
  const navigate = useNavigate();
  const createAccountMutation = useMutation(createCurrentUserMutation());
  const [step, setStep] = useState<Step>("choice");
  const [path, setPath] = useState<AuthPath>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
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

  function choosePath(nextPath: AuthPath) {
    setPath(nextPath);
    setStep(nextPath === "login" ? "login-email" : "signup");
  }

  function backToChoice() {
    setStep("choice");
  }

  function resetVerifyStep() {
    setCode("");
    setCodeError(null);
    setResendError(null);
  }

  async function sendCode(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    const { error } = await supabase.auth.signInWithOtp({ email });

    setBusy(false);

    if (error) {
      toast.show({ message: "Couldn't send the code. Try again.", variant: "error" });

      return;
    }

    resetVerifyStep();
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
    resetVerifyStep();
    setResendSecondsLeft(RESEND_COUNTDOWN_SECONDS);
    toast.show({ message: "New code sent" });
  }

  function changeEmail() {
    resetVerifyStep();
    setStep(path === "login" ? "login-email" : "signup");
  }

  function changeCode(next: string) {
    setCode(next);
    setCodeError(null);
  }

  async function verifyCode(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });

    setBusy(false);

    // Supabase answers a wrong code and an expired one the same way.
    if (error?.code === "otp_expired") {
      setCode("");
      setCodeError("Incorrect code entered. Please try again.");

      return;
    }

    if (error) {
      toast.show({ message: "Couldn't verify the code. Try again.", variant: "error" });

      return;
    }

    if (path === "signup") {
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

          toast.show({
            message: "Couldn't create your account, please enter your name again",
            variant: "error",
          });
          // A router navigation, not a page load, so the toast stays on screen.
          await navigate({ to: "/create-account" });
        },
        onSettled: () => setBusy(false),
      },
    );
  }

  return {
    step,
    name,
    setName,
    email,
    setEmail,
    code,
    busy,
    codeError,
    resendError,
    resendSecondsLeft,
    choosePath,
    backToChoice,
    sendCode,
    resendCode,
    changeEmail,
    changeCode,
    verifyCode,
  };
}
