import type { ReactNode } from "react";

import { Box, Logo, Text } from "@/design-system";

type AuthScreenProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

/** The logo above a card, the frame every login and sign-up screen shares. */
export function AuthScreen({ title, subtitle, children }: AuthScreenProps) {
  return (
    <Box className="flex min-h-screen flex-col items-center justify-center gap-lg p-md">
      <Logo className="w-full max-w-xs" />
      <Box className="flex w-full max-w-content-sm flex-col gap-sm rounded-md bg-surface p-lg">
        {title && (
          <Text variant="subheading" className="text-center normal-case">
            {title}
          </Text>
        )}
        {subtitle && (
          <Text variant="caption" className="text-center">
            {subtitle}
          </Text>
        )}
        {children}
      </Box>
    </Box>
  );
}
