import { z } from "zod";

/** The address a login code goes to. Only Supabase sees it, so the spec has no schema for it. */
export const emailSchema = z.email("Enter a valid email address.");
