import { createFileRoute, Link } from "@tanstack/react-router";

import { signOut } from "@/account";
import { Button, Text } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_onboarded/profile/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const { email } = Route.useRouteContext();

  return (
    <>
      {/* Text's heading variant renders an h2, and the page needs an h1. */}
      <h1 className="mb-lg text-heading">Your Info</h1>
      <div className="mb-xl">
        <Text variant="subheading">Email</Text>
        <Text variant="body">{email}</Text>
      </div>
      <Link
        to="/profile/settings/style-preferences"
        className="mb-xl flex items-center justify-between border border-primary px-md py-sm text-body hover:bg-surface focus-ring"
      >
        Style Preferences
        <span aria-hidden="true" className="text-heading leading-none">
          ›
        </span>
      </Link>
      <Button label="Sign out" variant="secondary" onClick={signOut} />
    </>
  );
}
