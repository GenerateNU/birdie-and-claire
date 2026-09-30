import { supabase } from "./supabase/client";

/** fetch for our own /api/v1 routes, with the signed-in user's Supabase token attached. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Every /api/v1 route rejects a request without a token, so don't send one.
  if (!session) {
    throw new Error("not signed in");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return fetch(path, { ...init, headers });
}
