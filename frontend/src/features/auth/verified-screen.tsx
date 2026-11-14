import { CheckCircleIcon } from "@phosphor-icons/react";

import { Box, Text } from "@/design-system";
import { AuthScreen } from "@/features/auth/auth-screen";

export function VerifiedScreen() {
  return (
    <AuthScreen>
      <Box role="status" className="flex flex-col items-center gap-sm">
        <CheckCircleIcon aria-hidden="true" className="size-xl text-success" />
        <Text variant="heading-m" className="text-success">
          Verified
        </Text>
        <Text variant="heading-m" className="italic">
          Welcome to the styler!
        </Text>
      </Box>
    </AuthScreen>
  );
}
