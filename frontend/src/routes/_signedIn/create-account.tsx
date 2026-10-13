import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type SyntheticEvent } from "react";

import { AccountError, hasAccountQuery } from "@/account";
import { apiFetch } from "@/api";

export const Route = createFileRoute("/_signedIn/create-account")({
  beforeLoad: async ({ context }) => {
    const hasAccount = await context.queryClient.query(hasAccountQuery(context.userId));

    if (hasAccount) {
      throw redirect({ to: "/", replace: true });
    }
  },
  errorComponent: AccountError,
  component: CreateAccount,
});

function CreateAccount() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("Creating...");

    try {
      const res = await apiFetch("/api/v1/users/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.status === 201 || res.status === 409) {
        // Has to stay a full page load. The cached "no account" answer never expires,
        // so a router navigation would send the user straight back here.
        window.location.assign("/");

        return;
      }

      throw new Error(`POST /api/v1/users/me failed: ${res.status}`);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Create your account</h1>
      <p className="text-gray-400 text-sm mb-8">
        Placeholder form: it only sends a name to create your account.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4 max-w-md">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={status !== null}
          className="rounded bg-blue-500 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Create account
        </button>
        {status && <p className="text-gray-400 text-sm">{status}</p>}
        {error && <p className="text-red-400 text-sm">Error: {error}</p>}
      </form>
    </div>
  );
}
