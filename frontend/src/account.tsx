import { queryOptions } from "@tanstack/react-query";
import { useRouter, useRouterState, type ErrorComponentProps } from "@tanstack/react-router";

import { apiFetch } from "@/api";
import { Button } from "@/design-system";
import { supabase } from "@/supabase/client";

/** Whether the signed-in user has a row in our users table. */
export function hasAccountQuery(userId: string) {
  return queryOptions({
    queryKey: ["has-account", userId],
    // Checked once per page load. Login, account creation, and sign-out all reload the page,
    // which is the only time the answer can change.
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const res = await apiFetch("/api/v1/users/me");

      if (res.status === 200) {
        return true;
      }

      if (res.status === 404) {
        return false;
      }

      throw new Error(`GET /api/v1/users/me failed: ${res.status}`);
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
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Couldn't load your account</h1>
      <p className="text-red-400 text-sm mb-4">
        Error: {error instanceof Error ? error.message : String(error)}
      </p>
      <div className="flex gap-2">
        <Button label="Retry" onClick={() => router.invalidate()} disabled={retrying} />
        <Button label="Sign out" variant="secondary" onClick={signOut} />
      </div>
    </div>
  );
}
