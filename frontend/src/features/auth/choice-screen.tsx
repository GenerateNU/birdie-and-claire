import { Box, Button, Divider, Text } from "@/design-system";
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
      <Box className="flex items-center gap-xs">
        <Divider className="flex-1 border-t" />
        <Text variant="caption">OR</Text>
        <Divider className="flex-1 border-t" />
      </Box>
      {/* Guest mode needs auth changes, so this is shown but does nothing yet. */}
      <Box className="flex flex-col items-center gap-xxs">
        <Button label="Continue as a guest" variant="secondary" size="sm" disabled />
        <Text variant="caption" className="text-secondary">
          Coming soon
        </Text>
      </Box>
    </AuthScreen>
  );
}
