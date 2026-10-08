import { useState, type SyntheticEvent } from "react";

import { apiFetch } from "./api";
import { supabase } from "./supabase/client";

type Step = "email" | "code";

export default function Login() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("Sending...");

    const { error: otpError } = await supabase.auth.signInWithOtp({ email });

    setStatus(null);

    if (otpError) {
      setError(otpError.message);

      return;
    }

    setStep("code");
  }

  async function verifyCode(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("Verifying...");

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verifyError) {
      setStatus(null);
      setError(verifyError.message);

      return;
    }

    try {
      const res = await apiFetch("/api/v1/users/me");

      if (res.status === 200) {
        window.location.assign("/");

        return;
      }

      if (res.status === 404) {
        window.location.assign("/create-account");

        return;
      }

      throw new Error(`GET /api/v1/users/me failed: ${res.status}`);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const busy = status !== null;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Log in</h1>

      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4 max-w-md">
          <p className="text-gray-400 text-sm">We'll email you a code.</p>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-500 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Send code
          </button>
          {status && <p className="text-gray-400 text-sm">{status}</p>}
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-4 max-w-md">
          <p className="text-gray-400 text-sm">
            Enter the code we sent to <span className="text-gray-200">{email}</span>.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Code
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-500 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Verify
          </button>
          {status && <p className="text-gray-400 text-sm">{status}</p>}
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
        </form>
      )}
    </div>
  );
}
