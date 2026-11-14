import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { redirect, useRouter, useRouterState } from "@tanstack/react-router";

import { getCurrentUser } from "@/api/generated/sdk.gen";
import type { CurrentUserResponse } from "@/api/generated/types.gen";
import { Box, Button, Page, Text } from "@/design-system";
import { supabase } from "@/lib/supabase";

/**
 * Where the signed-in user is in sign-up: no row in our users table yet, an account that
 * hasn't finished the onboarding preference steps, or done.
 */
export type AccountStatus = "none" | "needs-preferences" | "onboarded";

/** The caller's user, or null when they haven't created an account yet. */
async function fetchCurrentUser(): Promise<CurrentUserResponse | null> {
  const { data, error } = await getCurrentUser();

  if (error === undefined) {
    return data;
  }

  if (error.status === 404) {
    return null;
  }

  throw error;
}

function accountStatusQuery(userId: string) {
  return queryOptions({
    queryKey: ["account-status", userId],
    // Checked once per page load. Login, account creation, finishing onboarding, and sign-out
    // all reload the page, which is the only time the answer can change.
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<AccountStatus> => {
      const user = await fetchCurrentUser();

      if (user === null) {
        return "none";
      }

      return user.style_preferences === undefined ? "needs-preferences" : "onboarded";
    },
  });
}

// The route each status belongs on. Typed against AccountStatus, so a new status won't compile
// until it has a route.
const statusRoutes = {
  none: "/create-account",
  "needs-preferences": "/onboarding",
  onboarded: "/",
} as const satisfies Record<AccountStatus, string>;

/** The signed-in user's status, fetched once per page load. */
export function getAccountStatus(context: {
  queryClient: QueryClient;
  userId: string;
}): Promise<AccountStatus> {
  return context.queryClient.query(accountStatusQuery(context.userId));
}

/** For a route's beforeLoad: sends the user to their status's route unless it is in `allowed`. */
export async function requireAccountStatus(
  context: { queryClient: QueryClient; userId: string },
  allowed: AccountStatus[],
) {
  const status = await getAccountStatus(context);

  if (!allowed.includes(status)) {
    throw redirect({ to: statusRoutes[status], replace: true });
  }
}

// supabase-js clears the local session even when the server revoke fails, so the
// auth listener in main.tsx still redirects to /login. The error only means the refresh token
// may not have been revoked server-side.
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("sign out failed", error);
  }
}

export function AccountError() {
  const router = useRouter();
  const retrying = useRouterState({ select: (state) => state.isLoading });

  return (
    <Page>
      <Text variant="heading" className="mb-xs">
        Couldn't load your account
      </Text>
      <Text variant="body" className="mb-md text-error">
        Something went wrong. Try again, or sign out and back in.
      </Text>
      <Box className="flex gap-xs">
        <Button label="Retry" onClick={() => router.invalidate()} disabled={retrying} />
        <Button label="Sign out" variant="secondary" onClick={signOut} />
      </Box>
    </Page>
  );
}
