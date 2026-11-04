import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { Box, Button, Form, Page, Text, TextField } from "@/design-system";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  component: Login,
});

type Step = "email" | "code";

const emailSchema = z.object({ email: z.email("Enter a valid email") });

const codeSchema = z.object({ code: z.string().regex(/^\d+$/, "The code is digits only") });

async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    throw error;
  }
}

async function verifyCode({ email, code }: { email: string; code: string }) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });

  if (error) {
    throw error;
  }
}

function Login() {
  const [step, setStep] = useState<Step>("email");
  const [notice, setNotice] = useState<string | null>(null);

  const sendMutation = useMutation({ mutationFn: sendCode });

  const verifyMutation = useMutation({
    mutationFn: verifyCode,
    // The _onboarded route checks the account status and sends the user to account creation or
    // onboarding if needed.
    onSuccess: () => window.location.assign("/"),
  });

  const emailForm = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: emailSchema },
    onSubmit: ({ value }) => sendMutation.mutate(value.email, { onSuccess: () => setStep("code") }),
  });

  const codeForm = useForm({
    defaultValues: { code: "" },
    validators: { onSubmit: codeSchema },
    onSubmit: ({ value }) => {
      setNotice(null);
      verifyMutation.mutate({ email: emailForm.state.values.email, code: value.code });
    },
  });

  function resendCode() {
    setNotice(null);
    verifyMutation.reset();
    sendMutation.mutate(emailForm.state.values.email, {
      onSuccess: () => {
        // The new code replaces the old one, so digits already typed can only fail.
        codeForm.reset();
        setNotice("New code sent.");
      },
    });
  }

  function changeEmail() {
    setStep("email");
    setNotice(null);
    codeForm.reset();
    sendMutation.reset();
    verifyMutation.reset();
  }

  // Stays on while the reload after a successful verify starts.
  const verifying = verifyMutation.isPending || verifyMutation.isSuccess;
  const busy = sendMutation.isPending || verifying;

  return (
    <Page>
      <Text variant="heading" className="mb-xs">
        Log in
      </Text>

      {step === "email" ? (
        <Form form={emailForm} className="flex max-w-content-sm flex-col gap-md">
          <Text variant="body" className="text-secondary">
            We'll email you a code.
          </Text>
          <emailForm.Field name="email">
            {(field) => (
              <TextField
                label="Email"
                type="email"
                required
                value={field.state.value}
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                error={field.state.meta.errors.at(0)?.message}
              />
            )}
          </emailForm.Field>
          <Button
            label="Send code"
            type="submit"
            loading={sendMutation.isPending}
            loadingLabel="Sending…"
          />
          {sendMutation.isError && (
            <Text variant="body" className="text-error">
              Couldn't send the code. Try again.
            </Text>
          )}
        </Form>
      ) : (
        <Form form={codeForm} className="flex max-w-content-sm flex-col gap-md">
          <Text variant="body" className="text-secondary">
            Enter the code we sent to{" "}
            <emailForm.Subscribe selector={(state) => state.values.email}>
              {(email) => <span className="text-primary">{email}</span>}
            </emailForm.Subscribe>
            .
          </Text>
          <codeForm.Field name="code">
            {(field) => (
              <TextField
                label="Code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={field.state.value}
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                error={field.state.meta.errors.at(0)?.message}
              />
            )}
          </codeForm.Field>
          <Button
            label="Verify"
            type="submit"
            loading={verifying}
            disabled={busy}
            loadingLabel="Verifying…"
          />
          <Box className="flex gap-md">
            <Button label="Resend code" onClick={resendCode} disabled={busy} />
            <Button label="Change email" onClick={changeEmail} disabled={busy} />
          </Box>
          {notice && (
            <Text variant="body" className="text-secondary">
              {notice}
            </Text>
          )}
          {sendMutation.isError && (
            <Text variant="body" className="text-error">
              Couldn't send a new code. Try again.
            </Text>
          )}
          {verifyMutation.isError && (
            <Text variant="body" className="text-error">
              That code didn't work. Check it, or send a new one.
            </Text>
          )}
        </Form>
      )}
    </Page>
  );
}
