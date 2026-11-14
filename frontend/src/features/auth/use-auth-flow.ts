import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { createCurrentUserMutation } from "@/api/generated/@tanstack/react-query.gen";
import { useToast } from "@/design-system";
import { sendCode } from "@/features/auth/otp";

type Step = "choice" | "login-email" | "signup" | "verify" | "verified";

type AuthPath = "login" | "signup";

const VERIFIED_REDIRECT_MS = 2000;

/** The login and sign-up flow: which step is showing, the name and email it was given, and what
 * happens after each step. */
export function useAuthFlow() {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("choice");
  const [path, setPath] = useState<AuthPath>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const sendCodeMutation = useMutation({
    mutationFn: sendCode,
    onSuccess: () => setStep("verify"),
    onError: () => toast.show({ message: "Couldn't send the code. Try again.", variant: "error" }),
  });

  const createAccountMutation = useMutation({
    ...createCurrentUserMutation(),
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
  });

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

  function sendLoginCode(nextEmail: string) {
    setEmail(nextEmail);
    sendCodeMutation.mutate(nextEmail);
  }

  function sendSignupCode(nextName: string, nextEmail: string) {
    setName(nextName);
    setEmail(nextEmail);
    sendCodeMutation.mutate(nextEmail);
  }

  function changeEmail() {
    setStep(path === "login" ? "login-email" : "signup");
  }

  // Runs after the code is verified, so the account request carries the new session.
  function finishVerification() {
    if (path === "signup") {
      createAccountMutation.mutate({ body: { name } });

      return;
    }

    setStep("verified");
  }

  return {
    step,
    name,
    email,
    sendingCode: sendCodeMutation.isPending,
    choosePath,
    backToChoice,
    sendLoginCode,
    sendSignupCode,
    changeEmail,
    finishVerification,
  };
}
