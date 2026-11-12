import { useEffect, useRef, type SyntheticEvent } from "react";

import { Button, CodeInput, Text } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";

const AUTH_OTP_LENGTH = 8;

type VerifyScreenProps = {
  email: string;
  code: string;
  onCodeChange: (code: string) => void;
  codeError: string | null;
  resendSecondsLeft: number;
  resendError: string | null;
  busy: boolean;
  onResend: () => void;
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
  onChangeEmail: () => void;
};

export function VerifyScreen({
  email,
  code,
  onCodeChange,
  codeError,
  resendSecondsLeft,
  resendError,
  busy,
  onResend,
  onSubmit,
  onChangeEmail,
}: VerifyScreenProps) {
  const codeInputRef = useRef<HTMLInputElement>(null);

  // The field is disabled while the code is checked, which drops focus; give it back for a retry.
  useEffect(() => {
    if (codeError !== null) {
      codeInputRef.current?.focus();
    }
  }, [codeError]);

  return (
    <AuthScreen title="Enter your verification code" subtitle={`A code was sent to ${email}`}>
      <form onSubmit={onSubmit} className="flex flex-col items-center gap-sm">
        <CodeInput
          ref={codeInputRef}
          label="Verification code"
          length={AUTH_OTP_LENGTH}
          value={code}
          onValueChange={onCodeChange}
          invalid={codeError !== null}
          disabled={busy}
        />
        {codeError && (
          <Text variant="caption" role="alert" className="text-error">
            {codeError}
          </Text>
        )}
        {resendSecondsLeft > 0 ? (
          <Text variant="caption">Resend code in {resendSecondsLeft}s</Text>
        ) : (
          <Button
            label="Resend verification code"
            variant="secondary"
            size="sm"
            onClick={onResend}
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
      </form>
    </AuthScreen>
  );
}
