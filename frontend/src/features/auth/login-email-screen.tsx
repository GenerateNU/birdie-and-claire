import type { SyntheticEvent } from "react";

import { Button, TextField } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";

type LoginEmailScreenProps = {
  email: string;
  onEmailChange: (email: string) => void;
  busy: boolean;
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

export function LoginEmailScreen({
  email,
  onEmailChange,
  busy,
  onSubmit,
  onBack,
}: LoginEmailScreenProps) {
  return (
    <AuthScreen
      title="Sign in with email"
      subtitle="We will send you a verification code via this email address"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-sm">
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
          label="Send Code"
          type="submit"
          variant="secondary"
          disabled={email === "" || busy}
        />
        <Button label="Back" variant="secondary" size="sm" onClick={onBack} disabled={busy} />
      </form>
    </AuthScreen>
  );
}
