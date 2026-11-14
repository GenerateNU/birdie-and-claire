import { Button } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";

type ChoiceScreenProps = {
  onLogIn: () => void;
  onSignUp: () => void;
};

export function ChoiceScreen({ onLogIn, onSignUp }: ChoiceScreenProps) {
  return (
    <AuthScreen title="Log in or Sign up">
      <Button label="Log in" variant="secondary" onClick={onLogIn} />
      <Button label="Sign up" variant="secondary" onClick={onSignUp} />
    </AuthScreen>
  );
}
