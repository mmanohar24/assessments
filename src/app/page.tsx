import type { Metadata } from "next";
import Link from "next/link";
import { deleteChecklist } from "@/app/checklists/actions";
import { AppHeader } from "@/components/app-header";
import { ConfirmButton } from "@/components/confirm-button";
import { dateFormatter, isOverdue } from "@/lib/dates";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checklists" };

type Row = {
  id: string;
  client_name: string;
  due_date: string;
  is_closed: boolean;
  items: { status: "pending" | "sent" | "received" }[];
};

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("checklists")
    .select("id, client_name, due_date, is_closed, items(status)")
    .order("created_at", { ascending: false });

  const checklists = (data ?? []) as Row[];
  const formatDate = await dateFormatter();

  return (
    <>
      <AppHeader />
      <main id="main" className="page">
        <div className="page-head">
          <h1>Checklists</h1>
        </div>

        {error ? (
          <div className="empty" role="alert">
            <h2>Couldn&rsquo;t load your checklists</h2>
            <p className="muted">This is a problem on our side. Refresh the page in a minute.</p>
          </div>
        ) : checklists.length === 0 ? (
          <div className="empty">
            <h2>No checklists yet</h2>
            <p className="muted">
              You make checklists by asking Claude. Connect Chasely to Claude, then try something
              like:
            </p>
            <p className="quote">
              &ldquo;Make a tax filing document checklist for Ravi, a freelance designer in India
              with rental income, due Dec 15.&rdquo;
            </p>
            <Link href="/settings" className="btn btn-primary">
              Get your MCP URL
            </Link>
          </div>
        ) : (
          <ul className="list">
            {checklists.map((checklist) => {
              const total = checklist.items.length;
              const received = checklist.items.filter((i) => i.status === "received").length;
              const sent = checklist.items.filter((i) => i.status === "sent").length;
              const overdue = !checklist.is_closed && received < total && isOverdue(checklist.due_date);
              return (
                <li key={checklist.id} className="row">
                  <div className="row-main">
                    <Link href={`/checklists/${checklist.id}`} className="row-title">
                      {checklist.client_name}
                    </Link>
                    <p className="muted small">
                      Due {formatDate(checklist.due_date)}
                      {overdue ? " · Overdue" : ""}
                      {checklist.is_closed ? " · Closed" : ""}
                    </p>
                  </div>
                  <div className="row-progress">
                    <p className="small num">
                      {received} of {total} received
                      {sent > 0 ? <span className="muted"> · {sent} sent</span> : null}
                    </p>
                    <div className="bar" aria-hidden="true">
                      <span style={{ width: total ? `${(received / total) * 100}%` : 0 }} />
                    </div>
                  </div>
                  <ConfirmButton
                    label="Delete…"
                    ariaLabel={`Delete checklist for ${checklist.client_name}`}
                    title={`Delete the checklist for ${checklist.client_name}?`}
                    body="This removes the checklist and all its items, and the client's link stops working. This can't be undone."
                    confirmLabel="Delete checklist"
                    action={deleteChecklist}
                    fields={{ checklist_id: checklist.id }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
