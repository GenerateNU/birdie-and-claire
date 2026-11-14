import { useForm, useStore } from "@tanstack/react-form";
import { z } from "zod";

import { zCreateUserInputBody } from "@/api/generated/zod.gen";
import { Button, Form, TextField } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";
import type { SendCodeValues } from "@/features/auth/use-auth-flow";

const signupSchema = zCreateUserInputBody.extend({
  email: z.email("Enter a valid email address"),
});

type SignupScreenProps = {
  /** The name and email from an earlier visit, so "change the email address" brings them back. */
  defaultName: string;
  defaultEmail: string;
  busy: boolean;
  onSubmit: (values: SendCodeValues) => Promise<void>;
  onBack: () => void;
};

export function SignupScreen({
  defaultName,
  defaultEmail,
  busy,
  onSubmit,
  onBack,
}: SignupScreenProps) {
  const form = useForm({
    defaultValues: { name: defaultName, email: defaultEmail },
    validators: { onSubmit: signupSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });

  const name = useStore(form.store, (state) => state.values.name);
  const email = useStore(form.store, (state) => state.values.email);

  return (
    <AuthScreen title="Create an Account">
      <Form form={form} className="flex flex-col gap-sm">
        <form.Field name="name">
          {(field) => (
            <TextField
              label="Name"
              hideLabel
              placeholder="Enter Your Name"
              autoComplete="name"
              required
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.at(0)?.message}
              disabled={busy}
            />
          )}
        </form.Field>
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
          label="Sign up"
          type="submit"
          variant="secondary"
          disabled={name.trim() === "" || email === "" || busy}
        />
        <Button label="Back" variant="secondary" size="sm" onClick={onBack} disabled={busy} />
      </Form>
    </AuthScreen>
  );
}
