"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
