import { createFileRoute, Link } from "@tanstack/react-router";

import { signOut } from "@/account";

export const Route = createFileRoute("/_signedIn/_hasAccount/")({
  component: Home,
});

function Home() {
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
      <Link className="block underline hover:text-white text-sm" to="/profile-picture-test">
        Profile picture test →
      </Link>
      <Link className="block underline hover:text-white text-sm" to="/outfits">
        Outfits →
      </Link>
      <Link className="block underline hover:text-white text-sm" to="/llm-test">
        LLM test →
      </Link>
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
