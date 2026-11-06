import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Uses the service key, which skips row level security. Server only, and the
 * "server-only" import above makes the build fail if a browser file pulls this in.
 * Only for the MCP endpoint, MCP token management and the client page. Always filter
 * by user or by client token in code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
