import { supabase } from "@/lib/supabase";

// Supabase returns its error instead of throwing it, and a mutation only sees an error that is
// thrown.

/** Emails a one-time code to `email`. Supabase creates the auth user if there isn't one yet. */
export async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    throw error;
  }
}

/** Signs in with the code sent to `email`. */
export async function verifyCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });

  if (error) {
    throw error;
  }
}
