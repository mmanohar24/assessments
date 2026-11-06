"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { hashToken, newToken } from "@/lib/tokens";

export type TokenState = { mcpUrl?: string; error?: string };

/** Replaces the accountant's token, so any old MCP URL stops working right away. */
export async function regenerateMcpUrl(): Promise<TokenState> {
  const { user } = await requireUser();
  const token = newToken();

  const { error } = await createAdminClient()
    .from("mcp_tokens")
    .upsert(
      { user_id: user.id, token_hash: hashToken(token), created_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("mcp token save failed:", error.message);
    return { error: "Couldn't make a new URL. Your old one still works. Try again in a minute." };
  }

  revalidatePath("/settings");
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return { mcpUrl: `${base}/api/mcp/${token}` };
}
