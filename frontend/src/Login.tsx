import { useState, type SyntheticEvent } from "react";

import { supabase } from "./supabase/client";

type Step = "email" | "code";

export default function Login() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Kept apart from status, which disables the buttons while a request is in flight.
  const [notice, setNotice] = useState<string | null>(null);

  async function requestCode(): Promise<boolean> {
    setError(null);
    setNotice(null);
    setStatus("Sending...");

    const { error: otpError } = await supabase.auth.signInWithOtp({ email });

    setStatus(null);

    if (otpError) {
      setError(otpError.message);

      return false;
    }

    return true;
  }

  async function sendCode(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    if (await requestCode()) {
      setStep("code");
    }
  }

  async function resendCode() {
    if (!(await requestCode())) {
      return;
    }

    // The new code replaces the old one, so digits already typed can only fail.
    setCode("");
    setNotice("New code sent.");
  }

  function changeEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setNotice(null);
  }

  async function verifyCode(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
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

    // App checks for an account and sends the user to /create-account if there isn't one.
    window.location.assign("/");
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
          <div className="flex gap-4 text-sm">
            <button
              type="button"
              onClick={resendCode}
              disabled={busy}
              className="underline hover:text-white disabled:opacity-50"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={changeEmail}
              disabled={busy}
              className="underline hover:text-white disabled:opacity-50"
            >
              Change email
            </button>
          </div>
          {status && <p className="text-gray-400 text-sm">{status}</p>}
          {notice && <p className="text-gray-400 text-sm">{notice}</p>}
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
        </form>
      )}
    </div>
  );
}
