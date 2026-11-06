"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createGmailTransport, gmailConfigured } from "@/lib/email";
import {
  ACCOUNT_DAILY_CAP,
  GLOBAL_DAILY_CAP,
  sendReminder,
  type ClaimResult,
  type ReminderChecklist,
} from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import {
  LIMITS,
  clientNameError,
  dueDateError,
  emailError,
  dateFormatError,
  isUuid,
  noteError,
  titleError,
} from "@/lib/validation";

export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const NOT_FOUND = "This checklist couldn't be found. It may have been deleted.";
const CLOSED = "This checklist is closed. Reopen it to make changes.";
const SERVER_PROBLEM = "Couldn't save because of a problem on our side. Try again in a minute.";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function refresh(checklistId: string) {
  revalidatePath(`/checklists/${checklistId}`);
  revalidatePath("/");
}

function failed(message: string): FormState {
  console.error("checklist action failed:", message);
  return { error: SERVER_PROBLEM };
}

/** Row level security means this finds nothing for someone else's checklist. */
async function loadChecklist(checklistId: string) {
  const { supabase } = await requireUser();
  if (!isUuid(checklistId)) return { supabase, checklist: null };
  const { data: checklist } = await supabase
    .from("checklists")
    .select("id, is_closed, due_date")
    .eq("id", checklistId)
    .maybeSingle();
  return { supabase, checklist };
}

export async function deleteChecklist(formData: FormData): Promise<void> {
  const id = field(formData, "checklist_id");
  const { supabase } = await requireUser();
  if (isUuid(id)) {
    const { error } = await supabase.from("checklists").delete().eq("id", id);
    if (error) console.error("delete checklist failed:", error.message);
  }
  revalidatePath("/");
  if (formData.get("from") === "editor") redirect("/");
}

export async function setChecklistClosed(formData: FormData): Promise<void> {
  const id = field(formData, "checklist_id");
  const { supabase } = await requireUser();
  if (!isUuid(id)) return;
  const { error } = await supabase
    .from("checklists")
    .update({ is_closed: formData.get("closed") === "true" })
    .eq("id", id);
  if (error) console.error("close checklist failed:", error.message);
  refresh(id);
}

export async function updateDetails(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = field(formData, "checklist_id");
  const clientName = field(formData, "client_name");
  const clientEmail = field(formData, "client_email");
  const dueDate = field(formData, "due_date");

  const { supabase, checklist } = await loadChecklist(id);
  if (!checklist) return { error: NOT_FOUND };
  if (checklist.is_closed) return { error: CLOSED };

  const fieldErrors: Record<string, string> = {};
  const nameProblem = clientNameError(clientName, "Client name");
  if (nameProblem) fieldErrors.client_name = nameProblem;
  if (clientEmail) {
    const problem = emailError(clientEmail, "Email");
    if (problem) fieldErrors.client_email = problem;
  }
  // An already overdue date can stay when only the name or email is being changed.
  const dateProblem =
    dueDate === checklist.due_date
      ? dateFormatError(dueDate, "Due date")
      : dueDateError(dueDate, new Date(), "Due date");
  if (dateProblem) fieldErrors.due_date = dateProblem;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await supabase
    .from("checklists")
    .update({ client_name: clientName, client_email: clientEmail || null, due_date: dueDate })
    .eq("id", id);
  if (error) return failed(error.message);

  refresh(id);
  return { ok: true };
}

export async function updateItem(_previous: FormState, formData: FormData): Promise<FormState> {
  const checklistId = field(formData, "checklist_id");
  const itemId = field(formData, "item_id");
  const title = field(formData, "title");
  const note = field(formData, "note");

  const { supabase, checklist } = await loadChecklist(checklistId);
  if (!checklist || !isUuid(itemId)) return { error: NOT_FOUND };
  if (checklist.is_closed) return { error: CLOSED };

  const fieldErrors: Record<string, string> = {};
  const titleProblem = titleError(title, "Title");
  if (titleProblem) fieldErrors.title = titleProblem;
  const noteProblem = noteError(note, "Note");
  if (noteProblem) fieldErrors.note = noteProblem;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await supabase
    .from("items")
    .update({ title, note })
    .eq("id", itemId)
    .eq("checklist_id", checklistId);
  if (error) return failed(error.message);

  refresh(checklistId);
  return { ok: true };
}

export async function addItem(_previous: FormState, formData: FormData): Promise<FormState> {
  const checklistId = field(formData, "checklist_id");
  const title = field(formData, "title");
  const note = field(formData, "note");

  const { supabase, checklist } = await loadChecklist(checklistId);
  if (!checklist) return { error: NOT_FOUND };
  if (checklist.is_closed) return { error: CLOSED };

  const fieldErrors: Record<string, string> = {};
  const titleProblem = titleError(title, "Title");
  if (titleProblem) fieldErrors.title = titleProblem;
  const noteProblem = noteError(note, "Note");
  if (noteProblem) fieldErrors.note = noteProblem;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { data: existing, error: readError } = await supabase
    .from("items")
    .select("position")
    .eq("checklist_id", checklistId)
    .order("position", { ascending: false });
  if (readError) return failed(readError.message);
  if (existing.length >= LIMITS.maxItems) {
    return { error: `A checklist can have at most ${LIMITS.maxItems} items.` };
  }

  const { error } = await supabase.from("items").insert({
    checklist_id: checklistId,
    title,
    note,
    position: (existing[0]?.position ?? 0) + 1,
  });
  if (error) return failed(error.message);

  refresh(checklistId);
  return { ok: true };
}

export async function removeItem(formData: FormData): Promise<void> {
  const checklistId = field(formData, "checklist_id");
  const itemId = field(formData, "item_id");
  const { supabase, checklist } = await loadChecklist(checklistId);
  if (!checklist || checklist.is_closed || !isUuid(itemId)) return;
  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("checklist_id", checklistId);
  if (error) console.error("remove item failed:", error.message);
  refresh(checklistId);
}

/** Accountant only. Works whether or not the client ticked the item. */
export async function markReceived(formData: FormData): Promise<void> {
  const checklistId = field(formData, "checklist_id");
  const itemId = field(formData, "item_id");
  const { supabase, checklist } = await loadChecklist(checklistId);
  if (!checklist || checklist.is_closed || !isUuid(itemId)) return;
  const { error } = await supabase
    .from("items")
    .update({ received_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("checklist_id", checklistId)
    .is("received_at", null);
  if (error) console.error("mark received failed:", error.message);
  refresh(checklistId);
}

/** Lets the accountant fix a wrong click. The item goes back to sent if the client ticked it, otherwise pending. */
export async function undoReceived(formData: FormData): Promise<void> {
  const checklistId = field(formData, "checklist_id");
  const itemId = field(formData, "item_id");
  const { supabase, checklist } = await loadChecklist(checklistId);
  if (!checklist || checklist.is_closed || !isUuid(itemId)) return;
  const { error } = await supabase
    .from("items")
    .update({ received_at: null })
    .eq("id", itemId)
    .eq("checklist_id", checklistId);
  if (error) console.error("undo received failed:", error.message);
  refresh(checklistId);
}

export type ReminderState = { ok: boolean; message: string; nextAt?: string };

/** Sends one reminder for one checklist, to its own client email only. */
export async function sendChecklistReminder(checklistId: unknown): Promise<ReminderState> {
  const { supabase, user } = await requireUser();
  if (!isUuid(checklistId)) return { ok: false, message: NOT_FOUND };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!gmailConfigured() || !baseUrl) {
    return { ok: false, message: "Reminder emails aren't set up on this server yet, so nothing was sent." };
  }

  const admin = createAdminClient();
  const outcome = await sendReminder({
    ownerId: user.id,
    checklistId,
    baseUrl,
    demoOverride: process.env.DEMO_EMAIL_OVERRIDE,
    from: `Chasely <${process.env.GMAIL_USER!.trim()}>`,
    replyTo: user.email ?? undefined,
    transport: createGmailTransport(),
    // Row level security limits this to the logged-in accountant's own checklist.
    load: async () => {
      const { data } = await supabase
        .from("checklists")
        .select("client_name, client_email, due_date, public_token, items(title, status, position)")
        .eq("id", checklistId)
        .order("position", { referencedTable: "items", ascending: true })
        .maybeSingle();
      return data as ReminderChecklist | null;
    },
    claim: async () => {
      const { data, error } = await admin.rpc("claim_reminder", {
        p_owner_id: user.id,
        p_checklist_id: checklistId,
        p_account_cap: ACCOUNT_DAILY_CAP,
        p_global_cap: GLOBAL_DAILY_CAP,
      });
      if (error) throw new Error(error.message);
      return data as ClaimResult;
    },
    release: async (logId, previous) => {
      const { error } = await admin.rpc("release_reminder", {
        p_owner_id: user.id,
        p_checklist_id: checklistId,
        p_log_id: logId,
        p_previous: previous,
      });
      if (error) throw new Error(error.message);
    },
  }).catch((error: unknown) => {
    console.error("reminder failed:", error instanceof Error ? error.message : "unknown");
    return { ok: false as const, error: "The reminder couldn't be sent because of a problem on our side. Nothing was sent. Try again in a minute." };
  });

  refresh(checklistId);
  return outcome.ok
    ? { ok: true, message: outcome.message }
    : { ok: false, message: outcome.error, nextAt: "nextAt" in outcome ? outcome.nextAt : undefined };
}
