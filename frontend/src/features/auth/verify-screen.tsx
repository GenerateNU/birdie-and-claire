import { useForm, useStore } from "@tanstack/react-form";
import { useEffect, useRef } from "react";
import { z } from "zod";

import { Button, CodeInput, Form, Text } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";
import type { VerifyOutcome } from "@/features/auth/use-auth-flow";

const AUTH_OTP_LENGTH = 8;

const codeSchema = z.object({
  code: z.string().length(AUTH_OTP_LENGTH, "Enter the whole code"),
});

type VerifyScreenProps = {
  email: string;
  /** Supabase's answer to the last code; editing the code clears it through onCodeEdit. */
  codeError: string | null;
  onCodeEdit: () => void;
  resendSecondsLeft: number;
  resendError: string | null;
  busy: boolean;
  /** Resolves true when a new code was sent. */
  onResend: () => Promise<boolean>;
  onSubmit: (code: string) => Promise<VerifyOutcome>;
  onChangeEmail: () => void;
};

export function VerifyScreen({
  email,
  codeError,
  onCodeEdit,
  resendSecondsLeft,
  resendError,
  busy,
  onResend,
  onSubmit,
  onChangeEmail,
}: VerifyScreenProps) {
  const codeInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: { code: "" },
    validators: { onSubmit: codeSchema },
    onSubmit: async ({ value, formApi }) => {
      const outcome = await onSubmit(value.code);

      // A wrong or expired code can't be fixed by editing it, so the retry starts empty.
      if (outcome === "wrong-code") {
        formApi.reset();
      }
    },
  });

  const code = useStore(form.store, (state) => state.values.code);

  // The field is disabled while the code is checked, which drops focus; give it back for a retry.
  useEffect(() => {
    if (codeError !== null) {
      codeInputRef.current?.focus();
    }
  }, [codeError]);

  async function resend() {
    // The new code replaces the old one, so digits already typed can only fail.
    if (await onResend()) {
      form.reset();
    }
  }

  return (
    <AuthScreen title="Enter your verification code" subtitle={`A code was sent to ${email}`}>
      <Form form={form} className="flex flex-col items-center gap-sm">
        <form.Field name="code" listeners={{ onChange: onCodeEdit }}>
          {(field) => (
            <CodeInput
              ref={codeInputRef}
              label="Verification code"
              length={AUTH_OTP_LENGTH}
              value={field.state.value}
              onValueChange={field.handleChange}
              error={codeError ?? field.state.meta.errors.at(0)?.message}
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
            onClick={() => void resend()}
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
          disabled={code.length < AUTH_OTP_LENGTH || busy}
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
