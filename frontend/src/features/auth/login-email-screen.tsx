import { useForm } from "@tanstack/react-form";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { z } from "zod";

import { Box, Button, Divider, Form, Text, TextField } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";
import { emailSchema } from "@/features/auth/email-schema";

const loginSchema = z.object({ email: emailSchema });

type LoginEmailScreenProps = {
  defaultEmail: string;
  sending: boolean;
  onSubmit: (email: string) => void;
  onSignUp: () => void;
};

export function LoginEmailScreen({
  defaultEmail,
  sending,
  onSubmit,
  onSignUp,
}: LoginEmailScreenProps) {
  const form = useForm({
    defaultValues: { email: defaultEmail },
    validators: { onSubmit: loginSchema },
    // TanStack passes the raw field values, so parse them to send the trimmed email.
    onSubmit: ({ value }) => onSubmit(loginSchema.parse(value).email),
  });

  return (
    <AuthScreen
      title="Log in or Sign Up"
      subtitle="Create outfits built around your tastes and closet!"
    >
      <Form form={form} className="flex flex-col gap-sm">
        <form.Field name="email">
          {(field) => (
            <TextField
              label="Email"
              inputMode="email"
              placeholder="Enter your email"
              trailingIcon={EnvelopeSimpleIcon}
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
        <Button label="Log in" type="submit" loading={sending} loadingLabel="Sending…" />
      </Form>
      <Box className="flex items-center gap-sm">
        <Divider className="flex-1" />
        <Text variant="caption" className="uppercase text-secondary">
          Or
        </Text>
        <Divider className="flex-1" />
      </Box>
      <Box className="text-center">
        <Button
          label="Create an account"
          variant="ghost"
          className="normal-case"
          onClick={onSignUp}
          disabled={sending}
        />
      </Box>
    </AuthScreen>
  );
}
