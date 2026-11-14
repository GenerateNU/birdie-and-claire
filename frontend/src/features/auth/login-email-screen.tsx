import { useForm, useStore } from "@tanstack/react-form";
import { z } from "zod";

import { Button, Form, TextField } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";
import type { SendCodeValues } from "@/features/auth/use-auth-flow";

const emailSchema = z.object({ email: z.email("Enter a valid email address") });

type LoginEmailScreenProps = {
  /** The email from an earlier visit, so "change the email address" brings it back. */
  defaultEmail: string;
  busy: boolean;
  onSubmit: (values: SendCodeValues) => Promise<void>;
  onBack: () => void;
};

export function LoginEmailScreen({ defaultEmail, busy, onSubmit, onBack }: LoginEmailScreenProps) {
  const form = useForm({
    defaultValues: { email: defaultEmail },
    validators: { onSubmit: emailSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });

  const email = useStore(form.store, (state) => state.values.email);

  return (
    <AuthScreen
      title="Sign in with email"
      subtitle="We will send you a verification code via this email address"
    >
      <Form form={form} className="flex flex-col gap-sm">
        <form.Field name="email">
          {(field) => (
            <TextField
              label="Email"
              hideLabel
              inputMode="email"
              placeholder="Enter your email address"
              autoComplete="email"
              required
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.at(0)?.message}
              disabled={busy}
            />
          )}
        </form.Field>
        <Button
          label="Send Code"
          type="submit"
          variant="secondary"
          disabled={email === "" || busy}
        />
        <Button label="Back" variant="secondary" size="sm" onClick={onBack} disabled={busy} />
      </Form>
    </AuthScreen>
  );
}
