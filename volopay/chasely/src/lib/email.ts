import nodemailer from "nodemailer";

// Builds and sends reminder emails through Gmail SMTP.
// Never log what's built here: bodies hold the client's private link.

export type ReminderContent = {
  clientName: string;
  dueDate: string; // YYYY-MM-DD
  /** Titles of items that aren't received yet. Never client notes. */
  outstandingTitles: string[];
  clientUrl: string;
};

export type BuiltEmail = { to: string; subject: string; text: string; html: string };

const TIMEOUT_MS = 10_000;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "15 December 2026". Pinned to UTC so the day never shifts. */
export function formatEmailDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** The address an email really goes to, after the demo override. */
export function resolveRecipient(clientEmail: string, override: string | undefined) {
  const demo = override?.trim();
  return demo ? { to: demo, demoFor: clientEmail } : { to: clientEmail, demoFor: null };
}

export function buildReminderEmail(
  content: ReminderContent,
  recipient: { to: string; demoFor: string | null },
): BuiltEmail {
  const due = formatEmailDate(content.dueDate);
  const count = content.outstandingTitles.length;
  const subject =
    (recipient.demoFor ? `[Demo mode, would go to ${recipient.demoFor}] ` : "") +
    `Documents still needed for ${due}`;

  const text = [
    `Hi ${content.clientName},`,
    "",
    `This is a friendly reminder that your accountant still needs ${count === 1 ? "this document" : `these ${count} documents`} by ${due}:`,
    "",
    ...content.outstandingTitles.map((title) => `- ${title}`),
    "",
    "Send them the way your accountant asked. Then tick each one off on your checklist:",
    content.clientUrl,
    "",
    "This link is private to you, so please don't share it.",
    "",
    "Thanks!",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="font-family: system-ui, -apple-system, sans-serif; font-size: 15px; line-height: 1.5; color: #1c1c1a;">
<p>Hi ${escapeHtml(content.clientName)},</p>
<p>This is a friendly reminder that your accountant still needs ${count === 1 ? "this document" : `these ${count} documents`} by <strong>${escapeHtml(due)}</strong>:</p>
<ul>
${content.outstandingTitles.map((title) => `<li>${escapeHtml(title)}</li>`).join("\n")}
</ul>
<p>Send them the way your accountant asked. Then tick each one off on your checklist:</p>
<p><a href="${escapeHtml(content.clientUrl)}" style="color: #0b6b52;">Open your checklist</a></p>
<p style="color: #62625d; font-size: 13px;">This link is private to you, so please don't share it.</p>
<p>Thanks!</p>
</body></html>`;

  return { to: recipient.to, subject, text, html };
}

/** The part of a nodemailer transport this app uses. Tests pass a fake one. */
export type MailTransport = {
  sendMail: (message: {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<unknown>;
};

export function gmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim());
}

export function createGmailTransport(): MailTransport {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER?.trim(),
      // Gmail shows app passwords in groups of four. Spaces aren't part of it.
      pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ""),
    },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
}

/** Sends, and gives up after about 10 seconds even if the server goes quiet. */
export async function sendEmail(
  transport: MailTransport,
  email: BuiltEmail,
  options: { from: string; replyTo?: string; timeoutMs?: number },
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), options.timeoutMs ?? TIMEOUT_MS + 2_000);
  });
  try {
    await Promise.race([
      transport.sendMail({
        from: options.from,
        to: email.to,
        replyTo: options.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
