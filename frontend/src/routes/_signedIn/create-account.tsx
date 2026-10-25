import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type SyntheticEvent } from "react";

import { AccountError, accountStatusQuery } from "@/account";
import { apiFetch } from "@/api";
import { Button, Text, TextField } from "@/design-system";

export const Route = createFileRoute("/_signedIn/create-account")({
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.query(accountStatusQuery(context.userId));

    if (status !== "none") {
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
    <div className="min-h-screen p-xl">
      <Text variant="heading" className="mb-xs">
        Create your account
      </Text>
      <p className="text-secondary text-body mb-xl">
        Placeholder form: it only sends a name to create your account.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-md max-w-content-sm">
        <TextField label="Name" required value={name} onValueChange={setName} />
        <Button label="Create account" type="submit" disabled={status !== null} />
        {status && <p className="text-secondary text-body">{status}</p>}
        {error && <p className="text-error text-body">Error: {error}</p>}
      </form>
    </div>
  );
}
