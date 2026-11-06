import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { dateFormatter, isOverdue } from "@/lib/dates";
import { clientIp, withinLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPublicToken } from "@/lib/validation";
import { ClientItem, type ClientItemData } from "./client-item";

export const metadata: Metadata = { title: "Your documents" };

const VIEWS_PER_MINUTE = 120;

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main id="main" className="client">
      <h1>{title}</h1>
      <p className="muted">{body}</p>
    </main>
  );
}

export default async function ClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isPublicToken(token)) notFound();

  const admin = createAdminClient();
  if (!(await withinLimit(admin, `client:view:${clientIp(await headers())}`, VIEWS_PER_MINUTE))) {
    return <Message title="Too many visits" body="Wait a minute, then refresh the page." />;
  }

  // Only what the client needs. No email, owner or dates the accountant set.
  const { data: checklist, error } = await admin
    .from("checklists")
    .select("client_name, due_date, is_closed, items(id, title, note, status, client_note, position)")
    .eq("public_token", token)
    .order("position", { referencedTable: "items", ascending: true })
    .maybeSingle();

  if (error) {
    console.error("client page load failed:", error.message);
    return (
      <Message
        title="Couldn’t load your checklist"
        body="This is a problem on our side. Refresh the page in a minute."
      />
    );
  }
  if (!checklist) notFound();
  if (checklist.is_closed) {
    return (
      <Message
        title="This checklist is closed."
        body="Your accountant has closed it. If you still need to send something, contact them directly."
      />
    );
  }

  const items = (checklist.items ?? []) as ClientItemData[];
  const received = items.filter((i) => i.status === "received").length;
  const sent = items.filter((i) => i.status === "sent").length;
  const formatDate = await dateFormatter();
  const overdue = isOverdue(checklist.due_date);

  return (
    <main id="main" className="client">
      <header className="client-head">
        <p className="small muted">Documents for</p>
        <h1 className="break">{checklist.client_name}</h1>
        <p className={overdue ? "error" : "muted"}>
          {overdue ? "Was due " : "Due "}
          <span className="num">{formatDate(checklist.due_date)}</span>
        </p>
      </header>

      <div className="client-intro">
        <p>
          Send each document the way your accountant asked, for example by email. Chasely
          doesn&rsquo;t collect files. It only keeps track of what you&rsquo;ve sent.
        </p>
        <p>Once you&rsquo;ve sent one, tick &ldquo;I&rsquo;ve sent this&rdquo; below.</p>
      </div>

      <div className="client-progress">
        <p className="num" aria-live="polite">
          <strong>
            {received} of {items.length} received
          </strong>
          <span className="muted"> · {sent} sent, waiting for your accountant</span>
        </p>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${items.length ? (received / items.length) * 100 : 0}%` }} />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="muted">There&rsquo;s nothing on this checklist yet.</p>
      ) : (
        <ol className="client-list">
          {items.map((item) => (
            <li key={item.id}>
              <ClientItem token={token} item={item} />
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
