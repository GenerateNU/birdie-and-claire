import { useForm } from "@tanstack/react-form";

import { zCreateUserInputBody } from "@/api/generated/zod.gen";
import { Button, Form, TextField } from "@/design-system";
import { NAME_ERROR } from "@/features/account/account";
import { AuthScreen } from "@/features/auth/auth-screen";
import { emailSchema } from "@/features/auth/email-schema";

const signupSchema = zCreateUserInputBody.extend({ email: emailSchema });

type SignupScreenProps = {
  defaultName: string;
  defaultEmail: string;
  sending: boolean;
  onSubmit: (name: string, email: string) => void;
  onBack: () => void;
};

export function SignupScreen({
  defaultName,
  defaultEmail,
  sending,
  onSubmit,
  onBack,
}: SignupScreenProps) {
  const form = useForm({
    defaultValues: { name: defaultName, email: defaultEmail },
    validators: { onSubmit: signupSchema },
    onSubmit: ({ value }) => onSubmit(value.name, value.email),
  });

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
              aria-required
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.isValid ? undefined : NAME_ERROR}
              disabled={sending}
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
          label="Sign up"
          type="submit"
          variant="secondary"
          loading={sending}
          loadingLabel="Signing up…"
        />
        <Button label="Back" variant="secondary" size="sm" onClick={onBack} disabled={sending} />
      </Form>
    </AuthScreen>
  );
}
