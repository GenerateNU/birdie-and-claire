import { CheckCircle } from "@phosphor-icons/react";

import { Box, Text } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";

export function VerifiedScreen() {
  return (
    <AuthScreen>
      <Box role="status" className="flex flex-col items-center gap-sm">
        <CheckCircle aria-hidden="true" className="size-xl text-success" />
        <Text variant="body" className="text-success">
          Verified
        </Text>
        <Text variant="body">Welcome to the Styler!</Text>
      </Box>
    </AuthScreen>
  );
}
