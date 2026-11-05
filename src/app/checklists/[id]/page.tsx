import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteChecklist, setChecklistClosed } from "@/app/checklists/actions";
import { AppHeader } from "@/components/app-header";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { dateFormatter } from "@/lib/dates";
import { requireUser } from "@/lib/supabase/server";
import { LIMITS, isUuid } from "@/lib/validation";
import { AddItemForm, DetailsForm, ItemEditor, UnsavedChangesGuard } from "./editor-forms";

type Item = {
  id: string;
  title: string;
  note: string;
  status: "pending" | "sent" | "received";
  client_note: string | null;
};

async function load(id: string) {
  if (!isUuid(id)) return null;
  const { supabase } = await requireUser();
  // Row level security returns nothing for someone else's checklist, so it reads as not found.
  const { data } = await supabase
    .from("checklists")
    .select(
      "id, client_name, client_email, due_date, is_closed, items(id, title, note, status, client_note, position)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "items", ascending: true })
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const checklist = await load((await params).id);
  return { title: checklist ? checklist.client_name : "Not found" };
}

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const checklist = await load((await params).id);
  if (!checklist) notFound();

  const items = checklist.items as Item[];
  const received = items.filter((i) => i.status === "received").length;
  const sent = items.filter((i) => i.status === "sent").length;
  const closed = checklist.is_closed;
  const formatDate = await dateFormatter();

  return (
    <>
      <AppHeader />
      <UnsavedChangesGuard />
      <main id="main" className="page">
        <p className="small" style={{ marginBottom: 12 }}>
          <Link href="/">← All checklists</Link>
        </p>
        <div className="page-head">
          <div>
            <h1 className="break">{checklist.client_name}</h1>
            <p className="muted num">
              {received} of {items.length} received
              {sent > 0 ? ` · ${sent} sent, waiting for you to confirm` : ""}
              {" · "}Due {formatDate(checklist.due_date)}
            </p>
          </div>
        </div>

        {closed ? (
          <div className="banner">
            <p>
              <strong>This checklist is closed.</strong> Reopen it to make changes.
            </p>
            <form action={setChecklistClosed}>
              <input type="hidden" name="checklist_id" value={checklist.id} />
              <input type="hidden" name="closed" value="false" />
              <SubmitButton>Reopen</SubmitButton>
            </form>
          </div>
        ) : null}

        <section className="section" aria-labelledby="items-heading" style={{ marginTop: 0 }}>
          <h2 id="items-heading">Documents</h2>
          <div style={{ borderTop: "1px solid var(--line)" }}>
            {items.map((item, index) => (
              <ItemEditor
                key={item.id}
                checklistId={checklist.id}
                item={item}
                number={index + 1}
                closed={closed}
              />
            ))}
          </div>
        </section>

        {closed ? null : items.length < LIMITS.maxItems ? (
          <section className="section" aria-labelledby="add-heading">
            <h2 id="add-heading">Add a document</h2>
            <AddItemForm checklistId={checklist.id} />
          </section>
        ) : (
          <p className="muted section">
            This checklist has reached the limit of {LIMITS.maxItems} items.
          </p>
        )}

        <section className="section" aria-labelledby="details-heading">
          <h2 id="details-heading">Client details</h2>
          <DetailsForm
            checklistId={checklist.id}
            clientName={checklist.client_name}
            clientEmail={checklist.client_email}
            dueDate={checklist.due_date}
            closed={closed}
          />
        </section>

        <section className="section" aria-labelledby="manage-heading">
          <h2 id="manage-heading">Manage</h2>
          <div className="item-actions">
            {closed ? null : (
              <ConfirmButton
                label="Close checklist…"
                title="Close this checklist?"
                body="The client will see that it's closed and can't tick anything. Reminders stop. You can reopen it later."
                confirmLabel="Close checklist"
                action={setChecklistClosed}
                fields={{ checklist_id: checklist.id, closed: "true" }}
                danger={false}
              />
            )}
            <ConfirmButton
              label="Delete…"
              title={`Delete the checklist for ${checklist.client_name}?`}
              body="This removes the checklist and all its items, and the client's link stops working. This can't be undone."
              confirmLabel="Delete checklist"
              action={deleteChecklist}
              fields={{ checklist_id: checklist.id, from: "editor" }}
            />
          </div>
        </section>
      </main>
    </>
  );
}
