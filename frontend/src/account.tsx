import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  redirect,
  useRouter,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";

import { apiFetch } from "@/api";
import { Button, Text } from "@/design-system";
import { supabase } from "@/supabase/client";

/**
 * Where the signed-in user is in sign-up: no row in our users table yet, an account that
 * hasn't finished the onboarding preference steps, or done.
 */
export type AccountStatus = "none" | "needs-preferences" | "ready";

type CurrentUserResponse = {
  style_preferences?: object;
};

export function accountStatusQuery(userId: string) {
  return queryOptions({
    queryKey: ["account-status", userId],
    // Checked once per page load. Login, account creation, finishing onboarding, and sign-out
    // all reload the page, which is the only time the answer can change.
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<AccountStatus> => {
      const res = await apiFetch("/api/v1/users/me");

      if (res.status === 404) {
        return "none";
      }

      if (res.status !== 200) {
        throw new Error(`GET /api/v1/users/me failed: ${res.status}`);
      }

      // SAFETY: CurrentUserResponse in backend/openapi.yaml. style_preferences is left out
      // until onboarding is finished.
      const user = (await res.json()) as CurrentUserResponse;

      return user.style_preferences === undefined ? "needs-preferences" : "ready";
    },
  });
}

// The route each status belongs on. Typed against AccountStatus, so a new status won't compile
// until it has a route.
const statusRoutes = {
  none: "/create-account",
  "needs-preferences": "/onboarding",
  ready: "/",
} as const satisfies Record<AccountStatus, string>;

/** For a route's beforeLoad: sends the user to their status's route unless it is in `allowed`. */
export async function requireAccountStatus(
  context: { queryClient: QueryClient; userId: string },
  allowed: AccountStatus[],
) {
  const status = await context.queryClient.query(accountStatusQuery(context.userId));

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

/** Error screen for routes whose account check failed. */
export function AccountError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const retrying = useRouterState({ select: (state) => state.isLoading });

  return (
    <div className="min-h-screen p-xl">
      <Text variant="heading" className="mb-xs">
        Couldn't load your account
      </Text>
      <p className="text-error text-body mb-md">
        Error: {error instanceof Error ? error.message : String(error)}
      </p>
      <div className="flex gap-xs">
        <Button label="Retry" onClick={() => router.invalidate()} disabled={retrying} />
        <Button label="Sign out" variant="secondary" onClick={signOut} />
      </div>
    </div>
  );
}
