import { queryOptions } from "@tanstack/react-query";
import { useRouter, useRouterState, type ErrorComponentProps } from "@tanstack/react-router";

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
