import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";

import { createCurrentUserMutation } from "@/api/generated/@tanstack/react-query.gen";
import { Box, Button, CodeInput, Divider, Logo, Text, TextField, useToast } from "@/design-system";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  component: Login,
});

type Step = "choice" | "login-email" | "signup" | "verify" | "verified";

// Which path reached the verify step, so "Change the email address" returns to the right screen.
type Mode = "login" | "signup";

// The length set in the Supabase project's email OTP settings; the lofi draws 6 boxes.
const CODE_LENGTH = 8;

// Supabase also enforces its own minimum time between resends; a resend it refuses shows its error.
const RESEND_COUNTDOWN_SECONDS = 30;

const VERIFIED_REDIRECT_MS = 2000;

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
      toast.show({ message: "Couldn't send the code", subtitle: error.message });

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
      setResendError(error.message);

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
      toast.show({ message: "Couldn't verify the code", subtitle: error.message });

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
    return (
      <AuthScreen>
        <Box role="status" className="flex flex-col items-center gap-sm">
          <span
            aria-hidden="true"
            className="flex size-xl items-center justify-center rounded-full border-thick border-success text-success"
          >
            ✓
          </span>
          <Text variant="body" className="text-success">
            Verified
          </Text>
          <Text variant="body">Welcome to the Styler!</Text>
        </Box>
      </AuthScreen>
    );
  }

  if (step === "verify") {
    return (
      <AuthScreen title="Enter your verification code">
        <Text variant="caption" className="text-center">
          A code was sent to {email}
        </Text>
        <form onSubmit={verifyCode} className="flex flex-col items-center gap-sm">
          <CodeInput
            label="Verification code"
            length={CODE_LENGTH}
            value={code}
            onValueChange={typeCode}
            invalid={codeRejected}
            disabled={busy}
          />
          {codeRejected && (
            <Text variant="caption" role="alert" className="text-error">
              Incorrect code entered. Please try again.
            </Text>
          )}
          {resendSecondsLeft > 0 ? (
            <Text variant="caption">Resend code in {resendSecondsLeft}s</Text>
          ) : (
            <Button
              label="Resend verification code"
              variant="secondary"
              size="sm"
              onClick={() => void resendCode()}
              disabled={busy}
            />
          )}
          {resendError && (
            <Text variant="caption" className="text-error">
              {resendError}
            </Text>
          )}
          <Button
            label="Verify Code"
            type="submit"
            variant="secondary"
            disabled={code.length < CODE_LENGTH || busy}
          />
          <Button
            label="Change the email address"
            variant="secondary"
            size="sm"
            onClick={changeEmail}
            disabled={busy}
          />
        </form>
      </AuthScreen>
    );
  }

  if (step === "signup") {
    return (
      <AuthScreen title="Create an Account">
        <form onSubmit={sendCode} className="flex flex-col gap-sm">
          <TextField
            label="Name"
            hideLabel
            placeholder="Enter Your Name"
            autoComplete="name"
            // The endpoint caps name at 100 characters.
            maxLength={100}
            required
            value={name}
            onValueChange={setName}
            disabled={busy}
          />
          <TextField
            label="Email"
            hideLabel
            type="email"
            placeholder="Enter your email address"
            autoComplete="email"
            required
            value={email}
            onValueChange={setEmail}
            disabled={busy}
          />
          <Button
            label="Sign up"
            type="submit"
            variant="secondary"
            disabled={name.trim() === "" || email === "" || busy}
          />
          <Button
            label="Back"
            variant="secondary"
            size="sm"
            onClick={() => setStep("choice")}
            disabled={busy}
          />
        </form>
      </AuthScreen>
    );
  }

  if (step === "login-email") {
    return (
      <AuthScreen
        title="Sign in with email"
        subtitle="We will send you a verification code via this email address"
      >
        <form onSubmit={sendCode} className="flex flex-col gap-sm">
          <TextField
            label="Email"
            hideLabel
            type="email"
            placeholder="Enter your email address"
            autoComplete="email"
            required
            value={email}
            onValueChange={setEmail}
            disabled={busy}
          />
          <Button
            label="Send Code"
            type="submit"
            variant="secondary"
            disabled={email === "" || busy}
          />
          <Button
            label="Back"
            variant="secondary"
            size="sm"
            onClick={() => setStep("choice")}
            disabled={busy}
          />
        </form>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Log in or Sign up">
      <Button label="Log in" variant="secondary" onClick={() => choosePath("login")} />
      <Button label="Sign up" variant="secondary" onClick={() => choosePath("signup")} />
      <Box className="flex items-center gap-xs">
        <Divider className="flex-1 border-t" />
        <Text variant="caption">OR</Text>
        <Divider className="flex-1 border-t" />
      </Box>
      {/* Guest mode needs auth changes, so this is shown but does nothing yet. */}
      <Box className="flex flex-col items-center gap-xxs">
        <Button label="Continue as a guest" variant="secondary" size="sm" disabled />
        <Text variant="caption" className="text-secondary">
          Coming soon
        </Text>
      </Box>
    </AuthScreen>
  );
}

type AuthScreenProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

function AuthScreen({ title, subtitle, children }: AuthScreenProps) {
  return (
    <Box className="flex min-h-screen flex-col items-center justify-center gap-lg p-md">
      <Logo className="w-full max-w-xs" />
      <Box className="flex w-full max-w-content-sm flex-col gap-sm rounded-md bg-surface p-lg">
        {title && (
          <Text variant="subheading" className="text-center normal-case">
            {title}
          </Text>
        )}
        {subtitle && (
          <Text variant="caption" className="text-center">
            {subtitle}
          </Text>
        )}
        {children}
      </Box>
    </Box>
  );
}
