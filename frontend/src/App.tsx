import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

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
          onClick={() => supabase.auth.signOut()}
          className="rounded bg-blue-500 px-3 py-2 text-sm text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
