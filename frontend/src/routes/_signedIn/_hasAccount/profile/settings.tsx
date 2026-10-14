import { createFileRoute } from "@tanstack/react-router";

import { signOut } from "@/account";
import { Button, Text } from "@/design-system";
import { supabase } from "@/supabase/client";

export const Route = createFileRoute("/_signedIn/_hasAccount/profile/settings")({
  loader: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return { email: session?.user.email };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { email } = Route.useLoaderData();

  return (
    <>
      {/* Text's heading variant renders an h2, and the page needs an h1. */}
      <h1 className="mb-lg text-heading">Your Info</h1>
      {email && (
        <div className="mb-xl">
          <Text variant="subheading">Email</Text>
          <Text variant="body">{email}</Text>
        </div>
      )}
      <Button label="Sign out" variant="secondary" onClick={signOut} />
    </>
  );
}
