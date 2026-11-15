import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { Box, Button, Link, Text } from "@/design-system";
import { signOut } from "@/features/account/account";

export const Route = createFileRoute("/_signedIn/_onboarded/_nav/profile/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const { email } = Route.useRouteContext();

  return (
    <>
      <Text variant="heading" className="mb-lg">
        Your Info
      </Text>
      <Box className="mb-xl">
        <Text variant="subheading">Email</Text>
        <Text variant="body">{email}</Text>
      </Box>
      <Link
        to="/profile/settings/style-preferences"
        className="mb-xl flex items-center justify-between border border-primary px-md py-sm text-body-m hover:bg-surface focus-ring"
      >
        Style Preferences
        <ArrowRightIcon size={16} aria-hidden="true" />
      </Link>
      <Button label="Sign out" variant="secondary" onClick={signOut} />
    </>
  );
}
