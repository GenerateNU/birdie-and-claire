import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { apiFetch } from "./api";
import CreateAccount from "./CreateAccount";
import Login from "./Login";
import OutfitsPage from "./OutfitsPage";
import ProfilePictureTest from "./ProfilePictureTest";
import { supabase } from "./supabase/client";

export default function App() {
  // undefined until the first auth event, so a signed-in reload doesn't redirect.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const pathname = window.location.pathname;

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession && window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return null;
  }

  if (pathname === "/login") {
    return <Login />;
  }

  if (!session) {
    return null;
  }

  return <SignedInRoutes userId={session.user.id} pathname={pathname} />;
}

// supabase-js clears the local session even when the server revoke fails, so the
// auth listener still redirects to /login. The error only means the refresh token
// may not have been revoked server-side.
async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("sign out failed", error);
  }
}

// Only "has account" is cached. A cached "no account" would send a user who just
// signed up from / straight back to /create-account.
function hasAccountKey(userId: string) {
  return `has-account:${userId}`;
}

function SignedInRoutes({ userId, pathname }: { userId: string; pathname: string }) {
  const cachedHasAccount = sessionStorage.getItem(hasAccountKey(userId)) !== null;

  const account = useQuery({
    queryKey: ["has-account", userId],
    enabled: !cachedHasAccount,
    // The error screen has its own Retry button, so fail fast instead of a blank page during backoff.
    retry: false,
    queryFn: async () => {
      const res = await apiFetch("/api/v1/users/me");

      if (res.status === 200) {
        sessionStorage.setItem(hasAccountKey(userId), "true");

        return true;
      }

      if (res.status === 404) {
        return false;
      }

      throw new Error(`GET /api/v1/users/me failed: ${res.status}`);
    },
  });

  const hasAccount = cachedHasAccount || account.data === true;
  const missingAccount = account.data === false;

  let redirectTo: string | null = null;

  if (hasAccount && pathname === "/create-account") {
    redirectTo = "/";
  }

  if (missingAccount && pathname !== "/create-account") {
    redirectTo = "/create-account";
  }

  useEffect(() => {
    if (redirectTo) {
      window.location.replace(redirectTo);
    }
  }, [redirectTo]);

  if (redirectTo) {
    return null;
  }

  if (!hasAccount && account.isError) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <h1 className="text-3xl font-bold mb-2">Couldn't load your account</h1>
        <p className="text-red-400 text-sm mb-4">Error: {account.error.message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => account.refetch()}
            disabled={account.isFetching}
            className="rounded bg-blue-500 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={signOut}
            className="rounded bg-gray-700 px-3 py-2 text-sm text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!hasAccount && !missingAccount) {
    return null;
  }

  if (pathname === "/create-account") {
    return <CreateAccount />;
  }

  if (pathname === "/profile-picture-test") {
    return <ProfilePictureTest />;
  }

  if (pathname === "/outfits") {
    return <OutfitsPage />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Birdie &amp; Claire</h1>
      <p className="text-gray-400 text-sm mb-4">
        The API is at <code className="text-gray-200">/api/v1</code>. Docs are at{" "}
        <a className="underline hover:text-white" href="http://localhost:8080/docs">
          localhost:8080/docs
        </a>
        .
      </p>
      <a className="block underline hover:text-white text-sm" href="/profile-picture-test">
        Profile picture test →
      </a>
      <a className="block underline hover:text-white text-sm" href="/outfits">
        Outfits →
      </a>
      <div className="mt-6">
        <button
          type="button"
          onClick={signOut}
          className="rounded bg-blue-500 px-3 py-2 text-sm text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
