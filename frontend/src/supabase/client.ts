import { createClient } from "@supabase/supabase-js";

// Vite only exposes variables prefixed with VITE_
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.",
  );
}

export const supabase = createClient(url, anonKey);
