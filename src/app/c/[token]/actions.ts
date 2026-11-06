"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { clientIp, withinLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientNoteError, isPublicToken, isUuid } from "@/lib/validation";

// The client page has no login. Anyone with the link can call these, so every value
// is checked here and again in the database. They can only set sent_at and client_note.

export type ClientResult = { ok: true } | { ok: false; error: string };

const WRITES_PER_MINUTE = 60;

const MESSAGES: Record<string, string> = {
  not_found: "This document isn't on the checklist any more. Refresh the page to see the latest list.",
  closed: "This checklist is closed, so it can't be changed.",
  received: "Your accountant has already received this one, so it can't be changed.",
};
const TROUBLE = "That didn't save. Check your connection and try again.";

async function run(
  token: unknown,
  itemId: unknown,
  call: (admin: ReturnType<typeof createAdminClient>, token: string, itemId: string) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
): Promise<ClientResult> {
  if (!isPublicToken(token) || !isUuid(itemId)) {
    return { ok: false, error: "This link isn't valid. Check the link your accountant sent you." };
  }

  const admin = createAdminClient();
  const ip = clientIp(await headers());
  if (!(await withinLimit(admin, `client:write:${ip}`, WRITES_PER_MINUTE))) {
    return { ok: false, error: "Too many changes at once. Wait a minute and try again." };
  }

  const { data, error } = await call(admin, token, itemId);
  if (error) {
    console.error("client page save failed:", error.message);
    return { ok: false, error: TROUBLE };
  }

  // Refresh the page either way, so it shows what's really saved.
  revalidatePath(`/c/${token}`);
  if (data === "pending" || data === "sent") return { ok: true };
  return { ok: false, error: MESSAGES[String(data)] ?? TROUBLE };
}

export async function setItemSent(token: unknown, itemId: unknown, sent: unknown): Promise<ClientResult> {
  if (typeof sent !== "boolean") return { ok: false, error: TROUBLE };
  return run(token, itemId, (admin, t, id) =>
    admin.rpc("client_set_sent", { p_token: t, p_item_id: id, p_sent: sent }),
  );
}

export async function saveClientNote(token: unknown, itemId: unknown, note: unknown): Promise<ClientResult> {
  const clean = typeof note === "string" ? note.replace(/\r\n?/g, "\n") : note;
  const problem = clientNoteError(clean);
  if (problem) return { ok: false, error: problem };
  return run(token, itemId, (admin, t, id) =>
    admin.rpc("client_set_note", { p_token: t, p_item_id: id, p_note: (clean as string).trim() }),
  );
}
