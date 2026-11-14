import { z } from "zod";

/** The address a login code goes to. Only Supabase sees it, so the spec has no schema for it.
 * Trimmed first, because autofill and phone keyboards can leave a space at either end. */
export const emailSchema = z.string().trim().pipe(z.email("Enter a valid email address."));
