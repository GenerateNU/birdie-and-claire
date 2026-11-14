import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { Button, Form, TextField } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";
import { emailSchema } from "@/features/auth/email-schema";

const loginSchema = z.object({ email: emailSchema });

type LoginEmailScreenProps = {
  defaultEmail: string;
  sending: boolean;
  onSubmit: (email: string) => void;
  onBack: () => void;
};

export function LoginEmailScreen({
  defaultEmail,
  sending,
  onSubmit,
  onBack,
}: LoginEmailScreenProps) {
  const form = useForm({
    defaultValues: { email: defaultEmail },
    validators: { onSubmit: loginSchema },
    onSubmit: ({ value }) => onSubmit(value.email),
  });

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
              aria-required
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.at(0)?.message}
              disabled={sending}
            />
          )}
        </form.Field>
        <Button
          label="Send Code"
          type="submit"
          variant="secondary"
          loading={sending}
          loadingLabel="Sending…"
        />
        <Button label="Back" variant="secondary" size="sm" onClick={onBack} disabled={sending} />
      </Form>
    </AuthScreen>
  );
}
