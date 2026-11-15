import type { ReactNode } from "react";

import { Box, Logo, Page, Text } from "@/design-system";

type AuthScreenProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

/** The logo above a card, the frame every login and sign-up screen shares. */
export function AuthScreen({ title, subtitle, children }: AuthScreenProps) {
  return (
    <Page className="flex flex-col items-center justify-center gap-xxl">
      <Logo className="w-logo-header object-cover object-bottom" />
      <Box className="flex w-full max-w-content-sm flex-col gap-lg border bg-card p-xxl">
        {title && (
          <Text variant="heading" className="text-center">
            {title}
          </Text>
        )}
        {subtitle && (
          <Text variant="body-m" className="text-center text-secondary">
            {subtitle}
          </Text>
        )}
        {children}
      </Box>
    </Page>
  );
}
