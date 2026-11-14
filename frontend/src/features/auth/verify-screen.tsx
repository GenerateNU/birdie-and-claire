import { isAuthError } from "@supabase/supabase-js";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { Button, CodeInput, Form, Text, useToast } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";
import { sendCode, verifyCode } from "@/features/auth/otp";

const AUTH_OTP_LENGTH = 8;

// Supabase's default minimum time between codes sent to one address; an earlier resend is refused.
const RESEND_COUNTDOWN_SECONDS = 60;

// The error codes Supabase answers with when a code was requested too soon after the last one.
const RATE_LIMIT_CODES = ["over_email_send_rate_limit", "over_request_rate_limit"];

const codeSchema = z.object({ code: z.string().length(AUTH_OTP_LENGTH, "Enter the full code.") });

// Supabase answers a wrong code and an expired one the same way.
function isWrongCode(error: Error | null) {
  return isAuthError(error) && error.code === "otp_expired";
}

function resendErrorMessage(error: Error) {
  if (isAuthError(error) && RATE_LIMIT_CODES.includes(error.code ?? "")) {
    return "Please wait a moment before asking for a new code.";
  }

  return "Couldn't send a new code. Try again.";
}

type VerifyScreenProps = {
  email: string;
  onVerified: () => void;
  onChangeEmail: () => void;
};

export function VerifyScreen({ email, onVerified, onChangeEmail }: VerifyScreenProps) {
  const toast = useToast();
  const codeInputRef = useRef<HTMLInputElement>(null);
  // Starts full because this screen only mounts right after a code is sent.
  const [resendSecondsLeft, setResendSecondsLeft] = useState(RESEND_COUNTDOWN_SECONDS);

  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyCode(email, code),
    onSuccess: onVerified,
  });

  const form = useForm({
    defaultValues: { code: "" },
    validators: { onSubmit: codeSchema },
    onSubmit: ({ value, formApi }) =>
      verifyMutation.mutate(value.code, {
        onError: (error) => {
          if (isWrongCode(error)) {
            formApi.setFieldValue("code", "");

            return;
          }

          toast.show({ message: "Couldn't verify the code. Try again.", variant: "error" });
        },
      }),
  });

  const resendMutation = useMutation({
    mutationFn: () => sendCode(email),
    onSuccess: () => {
      // The new code replaces the old one, so digits already typed can only fail.
      form.reset();
      verifyMutation.reset();
      setResendSecondsLeft(RESEND_COUNTDOWN_SECONDS);
      toast.show({ message: "New code sent" });
    },
  });

  useEffect(() => {
    if (resendSecondsLeft === 0) {
      return;
    }

    const timer = setTimeout(() => setResendSecondsLeft(resendSecondsLeft - 1), 1000);

    return () => clearTimeout(timer);
  }, [resendSecondsLeft]);

  const wrongCode = isWrongCode(verifyMutation.error);

  // The field is disabled while the code is checked, which drops focus; give it back for a retry.
  useEffect(() => {
    if (wrongCode) {
      codeInputRef.current?.focus();
    }
  }, [wrongCode]);

  // Stays on after the code checks out, while the flow finishes and this screen waits to unmount.
  const verifying = verifyMutation.isPending || verifyMutation.isSuccess;
  const busy = verifying || resendMutation.isPending;

  return (
    <AuthScreen title="Enter your verification code" subtitle={`A code was sent to ${email}`}>
      <Form form={form} className="flex flex-col items-center gap-sm">
        <form.Field name="code">
          {(field) => (
            <CodeInput
              ref={codeInputRef}
              label="Verification code"
              length={AUTH_OTP_LENGTH}
              value={field.state.value}
              onValueChange={(next) => {
                field.handleChange(next);
                verifyMutation.reset();
              }}
              error={
                wrongCode
                  ? "Incorrect code entered. Please try again."
                  : field.state.meta.errors.at(0)?.message
              }
              disabled={busy}
            />
          )}
        </form.Field>
        {resendSecondsLeft > 0 ? (
          <Text variant="caption">Resend code in {resendSecondsLeft}s</Text>
        ) : (
          <Button
            label="Resend verification code"
            variant="secondary"
            size="sm"
            onClick={() => resendMutation.mutate()}
            loading={resendMutation.isPending}
            loadingLabel="Sending…"
            disabled={busy}
          />
        )}
        {resendMutation.isError && (
          <Text variant="caption" className="text-error">
            {resendErrorMessage(resendMutation.error)}
          </Text>
        )}
        <Button
          label="Verify Code"
          type="submit"
          variant="secondary"
          loading={verifying}
          loadingLabel="Verifying…"
          disabled={busy}
        />
        <Button
          label="Change the email address"
          variant="secondary"
          size="sm"
          onClick={onChangeEmail}
          disabled={busy}
        />
      </Form>
    </AuthScreen>
  );
}
