import type { SyntheticEvent } from "react";

import { Button, TextField } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";

type SignupScreenProps = {
  name: string;
  onNameChange: (name: string) => void;
  email: string;
  onEmailChange: (email: string) => void;
  busy: boolean;
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

export function SignupScreen({
  name,
  onNameChange,
  email,
  onEmailChange,
  busy,
  onSubmit,
  onBack,
}: SignupScreenProps) {
  return (
    <AuthScreen title="Create an Account">
      <form onSubmit={onSubmit} className="flex flex-col gap-sm">
        <TextField
          label="Name"
          hideLabel
          placeholder="Enter Your Name"
          autoComplete="name"
          // The endpoint caps name at 100 characters.
          maxLength={100}
          required
          value={name}
          onValueChange={onNameChange}
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
          onValueChange={onEmailChange}
          disabled={busy}
        />
        <Button
          label="Sign up"
          type="submit"
          variant="secondary"
          disabled={name.trim() === "" || email === "" || busy}
        />
        <Button label="Back" variant="secondary" size="sm" onClick={onBack} disabled={busy} />
      </form>
    </AuthScreen>
  );
}
