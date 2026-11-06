import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteChecklist, setChecklistClosed } from "@/app/checklists/actions";
import { AppHeader } from "@/components/app-header";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { dateFormatter, dateTimeFormatter, isOverdue } from "@/lib/dates";
import { requireUser } from "@/lib/supabase/server";
import { LIMITS, isUuid } from "@/lib/validation";
import { ClientLink } from "./client-link";
import { GuidePanel, GuideProvider, GuideToggle } from "./guide";
import {
  AddDocumentButton,
  DetailsForm,
  DocumentRow,
  SendReminderButton,
  UnsavedChangesGuard,
  type Item,
} from "./editor-forms";

// The editor is split into steps the accountant can open in any order. The step is in
// the URL (?step=client), so links, Back and Forward all work.
const STEPS = [
  { key: "documents", label: "Documents", short: "Documents" },
  { key: "client", label: "Client", short: "Client" },
  { key: "share", label: "Share and remind", short: "Share" },
  { key: "manage", label: "Manage", short: "Manage" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

function stepFrom(value: string | string[] | undefined): (typeof STEPS)[number] {
  return STEPS.find((s) => s.key === value) ?? STEPS[0];
}

async function load(id: string) {
  if (!isUuid(id)) return null;
  const { supabase } = await requireUser();
  // Row level security returns nothing for someone else's checklist, so it reads as not found.
  const { data } = await supabase
    .from("checklists")
    .select(
      "id, client_name, client_email, due_date, is_closed, public_token, last_reminder_at, items(id, title, note, status, client_note, position)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "items", ascending: true })
    .maybeSingle();
  return data;
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const checklist = await load((await params).id);
  if (!checklist) return { title: "Not found" };
  return { title: `${checklist.client_name}: ${stepFrom((await searchParams).step).label}` };
}

export default async function ChecklistPage({ params, searchParams }: PageProps) {
  const checklist = await load((await params).id);
  if (!checklist) notFound();
  const step = stepFrom((await searchParams).step);

  const items = checklist.items as Item[];
  const received = items.filter((i) => i.status === "received").length;
  const sent = items.filter((i) => i.status === "sent").length;
  const closed = checklist.is_closed;
  const formatDate = await dateFormatter();
  const overdue = !closed && received < items.length && isOverdue(checklist.due_date);
  const percent = items.length ? Math.round((received / items.length) * 100) : 0;
  const href = (key: StepKey) =>
    key === "documents" ? `/checklists/${checklist.id}` : `/checklists/${checklist.id}?step=${key}`;

  return (
    <>
      <AppHeader />
      <UnsavedChangesGuard />
      <GuideProvider>
        <main id="main" className="page editor">
        <p className="small" style={{ marginBottom: 12 }}>
          <Link href="/">← All checklists</Link>
        </p>

        {/* Stays on screen while scrolling and moving between steps. */}
        <div className="editor-head">
          <div className="editor-title">
            <div className="editor-title-row">
              <h1 className="break">{checklist.client_name}</h1>
              {step.key === "documents" ? <GuideToggle /> : null}
            </div>
            <p className={`small num ${overdue ? "error" : "muted"}`}>
              {overdue ? "Overdue, was due " : "Due "}
              {formatDate(checklist.due_date)}
              {closed ? " · Closed" : ""}
            </p>
          </div>
          <div className="editor-progress">
            <p className="small num">
              <strong>
                {received} of {items.length} received
              </strong>
              <span className="muted">, {sent} sent</span>
            </p>
            <div
              className="bar"
              role="progressbar"
              aria-label="Documents received"
              aria-valuemin={0}
              aria-valuemax={items.length}
              aria-valuenow={received}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>

          <nav aria-label="Checklist steps">
            <ol className="stepper">
              {STEPS.map((s, index) => {
                const active = s.key === step.key;
                return (
                  <li key={s.key}>
                    <Link
                      href={href(s.key)}
                      className={`step${active ? " is-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      scroll={false}
                    >
                      <span className="step-num num" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className="step-long">{s.label}</span>
                      <span className="step-short" aria-hidden="true">
                        {s.short}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
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

        <section className="step-panel" aria-labelledby="step-heading">
          {step.key === "documents" ? (
            <>
              <GuidePanel />
              <div className="step-panel-head">
                <h2 id="step-heading" tabIndex={-1}>
                  Documents
                </h2>
                {!closed && items.length < LIMITS.maxItems ? (
                  <AddDocumentButton checklistId={checklist.id} />
                ) : null}
              </div>
              {!closed && items.length >= LIMITS.maxItems ? (
                <p className="muted small">
                  This checklist has reached the limit of {LIMITS.maxItems} items.
                </p>
              ) : null}
              {items.length === 0 ? (
                <div className="empty">
                  <p className="muted">There are no documents on this checklist yet.</p>
                </div>
              ) : (
                <ol className="doc-list">
                  {items.map((item, index) => (
                    <DocumentRow
                      key={item.id}
                      checklistId={checklist.id}
                      item={item}
                      number={index + 1}
                      closed={closed}
                    />
                  ))}
                </ol>
              )}
            </>
          ) : null}

          {step.key === "client" ? (
            <>
              <h2 id="step-heading">Client details</h2>
              <DetailsForm
                checklistId={checklist.id}
                clientName={checklist.client_name}
                clientEmail={checklist.client_email}
                dueDate={checklist.due_date}
                closed={closed}
              />
            </>
          ) : null}

          {step.key === "share" ? (
            <ShareStep
              checklistId={checklist.id}
              publicToken={checklist.public_token}
              clientEmail={checklist.client_email}
              lastReminderAt={checklist.last_reminder_at}
              closed={closed}
              clientStepHref={href("client")}
            />
          ) : null}

          {step.key === "manage" ? (
            <>
              <h2 id="step-heading">Manage</h2>
              <div className="manage-list">
                <div className="manage-row">
                  <div>
                    <p>
                      <strong>{closed ? "Reopen checklist" : "Close checklist"}</strong>
                    </p>
                    <p className="small muted">
                      {closed
                        ? "Lets the client tick items again and lets you make changes."
                        : "The client sees it's closed and can't tick anything. Reminders stop. You can reopen it later."}
                    </p>
                  </div>
                  {closed ? (
                    <form action={setChecklistClosed}>
                      <input type="hidden" name="checklist_id" value={checklist.id} />
                      <input type="hidden" name="closed" value="false" />
                      <SubmitButton>Reopen</SubmitButton>
                    </form>
                  ) : (
                    <ConfirmButton
                      label="Close checklist"
                      title="Close this checklist?"
                      body="The client will see that it's closed and can't tick anything. Reminders stop. You can reopen it later."
                      confirmLabel="Close checklist"
                      action={setChecklistClosed}
                      fields={{ checklist_id: checklist.id, closed: "true" }}
                      danger={false}
                    />
                  )}
                </div>
                <div className="manage-row">
                  <div>
                    <p>
                      <strong>Delete checklist</strong>
                    </p>
                    <p className="small muted">
                      Removes it for good. The client&rsquo;s link stops working.
                    </p>
                  </div>
                  <ConfirmButton
                    label="Delete"
                    title={`Delete the checklist for ${checklist.client_name}?`}
                    body="This removes the checklist and all its items, and the client's link stops working. This can't be undone."
                    confirmLabel="Delete checklist"
                    action={deleteChecklist}
                    fields={{ checklist_id: checklist.id, from: "editor" }}
                  />
                </div>
              </div>
            </>
          ) : null}
        </section>
        </main>
      </GuideProvider>
    </>
  );
}

async function ShareStep({
  checklistId,
  publicToken,
  clientEmail,
  lastReminderAt,
  closed,
  clientStepHref,
}: {
  checklistId: string;
  publicToken: string;
  clientEmail: string | null;
  lastReminderAt: string | null;
  closed: boolean;
  clientStepHref: string;
}) {
  const formatDateTime = await dateTimeFormatter();
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const demoMode = Boolean(process.env.DEMO_EMAIL_OVERRIDE?.trim());

  return (
    <>
      <h2 id="step-heading">Share and remind</h2>
      <ClientLink url={`${baseUrl}/c/${publicToken}`} />

      <div className="stack">
        <h3 className="subhead">Reminder email</h3>
        <p className="small muted">
          Sends {clientEmail ? <strong className="break">{clientEmail}</strong> : "the client"} a
          short email listing what&rsquo;s still missing, with their link. At most one every 24
          hours.
        </p>
        {demoMode ? (
          <p className="small demo-note">
            <strong>Demo mode is on.</strong> Reminders go to the demo inbox, not to the client. The
            subject says who it would have gone to.
          </p>
        ) : null}
        {closed ? (
          <p className="small muted">Reopen the checklist to send reminders.</p>
        ) : (
          <SendReminderButton checklistId={checklistId} hasEmail={Boolean(clientEmail)} />
        )}
        {!clientEmail && !closed ? (
          <p className="small muted">
            No client email yet. Add one in <Link href={clientStepHref}>Client</Link>.
          </p>
        ) : null}
        <p className="small muted">
          {lastReminderAt
            ? `Last reminder sent ${formatDateTime(lastReminderAt)}.`
            : "No reminder sent yet."}
        </p>
      </div>
    </>
  );
}
