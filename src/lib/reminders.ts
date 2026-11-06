import {
  buildReminderEmail,
  resolveRecipient,
  sendEmail,
  type MailTransport,
} from "@/lib/email";

// The reminder flow, with the database and the mail server passed in so tests can
// fake both. Order: check the rules and claim in the database, then send, and if the
// send fails, release the claim so last_reminder_at goes back to what it was.

export const ACCOUNT_DAILY_CAP = 5;
export const GLOBAL_DAILY_CAP = 30;

export type ClaimResult =
  | { result: "ok"; log_id: string; previous: string | null }
  | { result: "too_soon"; next_at: string }
  | { result: "not_found" | "closed" | "no_email" | "all_received" | "account_cap" | "global_cap" };

export type ReminderChecklist = {
  client_name: string;
  client_email: string | null;
  due_date: string;
  public_token: string;
  items: { title: string; status: "pending" | "sent" | "received" }[];
};

export type ReminderDeps = {
  ownerId: string;
  checklistId: string;
  baseUrl: string;
  demoOverride: string | undefined;
  from: string;
  replyTo?: string;
  claim: () => Promise<ClaimResult>;
  release: (logId: string, previous: string | null) => Promise<void>;
  load: () => Promise<ReminderChecklist | null>;
  transport: MailTransport;
};

export type ReminderOutcome =
  | { ok: true; message: string }
  | { ok: false; error: string; nextAt?: string };

const REFUSALS: Record<string, string> = {
  not_found: "This checklist couldn't be found. It may have been deleted.",
  closed: "This checklist is closed, so no reminder was sent. Reopen it first.",
  no_email: "Reminders need a client email. Add one in Client details and save it first.",
  all_received: "Every document is already received, so there's nothing to remind about.",
  account_cap: `You've sent ${ACCOUNT_DAILY_CAP} reminders in the last 24 hours, which is the limit for now. Try again tomorrow.`,
  global_cap: "Chasely has reached its reminder limit for today. Try again tomorrow.",
};

export async function sendReminder(deps: ReminderDeps): Promise<ReminderOutcome> {
  // Load first, so we know what to send before claiming anything.
  const checklist = await deps.load();
  if (!checklist) return { ok: false, error: REFUSALS.not_found };

  const claim = await deps.claim();
  if (claim.result === "too_soon") {
    return {
      ok: false,
      error: "A reminder already went out for this checklist in the last 24 hours.",
      nextAt: claim.next_at,
    };
  }
  if (claim.result !== "ok") return { ok: false, error: REFUSALS[claim.result] };

  try {
    // The database confirmed there's an email and at least one item left.
    const recipient = resolveRecipient(checklist.client_email!, deps.demoOverride);
    const email = buildReminderEmail(
      {
        clientName: checklist.client_name,
        dueDate: checklist.due_date,
        outstandingTitles: checklist.items.filter((i) => i.status !== "received").map((i) => i.title),
        clientUrl: `${deps.baseUrl}/c/${checklist.public_token}`,
      },
      recipient,
    );
    await sendEmail(deps.transport, email, { from: deps.from, replyTo: deps.replyTo });

    return {
      ok: true,
      message: recipient.demoFor
        ? `Demo mode: sent to the demo inbox instead of ${recipient.demoFor}.`
        : `Reminder sent to ${recipient.to}.`,
    };
  } catch (error) {
    // Only the error code, never the message, which can echo addresses or content.
    const code = (error as { code?: string; responseCode?: number })?.code ?? "unknown";
    console.error("reminder email failed:", code);
    try {
      await deps.release(claim.log_id, claim.previous);
    } catch {
      console.error("reminder release failed");
    }
    return {
      ok: false,
      error:
        code === "EAUTH"
          ? "The reminder couldn't be sent because Chasely's email login was refused. Nothing was sent, and you can try again once it's fixed."
          : "The reminder couldn't be sent. Nothing was sent, so you can try again in a minute.",
    };
  }
}
