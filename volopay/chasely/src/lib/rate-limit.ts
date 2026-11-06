import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";

/**
 * Counts one hit against `key` in a one-minute window and says whether it's allowed.
 * The key is hashed first, so raw tokens and IP addresses are never stored.
 */
export async function withinLimit(
  admin: ReturnType<typeof createAdminClient>,
  key: string,
  max: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("hit_rate_limit", {
    p_key: hashToken(key),
    p_max: max,
    p_window_seconds: 60,
  });
  // If the counter itself fails, let the request through instead of blocking everyone.
  if (error) {
    console.error("rate limit check failed:", error.message);
    return true;
  }
  return data === true;
}

/** The visitor's IP as Vercel reports it. */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
