import { describe, expect, it, vi } from "vitest";
import { buildReminderEmail, escapeHtml, resolveRecipient, type MailTransport } from "@/lib/email";
import { sendReminder, type ClaimResult, type ReminderDeps } from "@/lib/reminders";

// No real email is ever sent here. Every test uses a fake transport.

const checklist = {
  client_name: "Ravi <b>Menon</b>",
  client_email: "ravi@example.com",
  due_date: "2026-12-15",
  public_token: "tok_abc",
  items: [
    { title: "Form 16", status: "received" as const },
    { title: "Bank statements & <script>alert(1)</script>", status: "sent" as const },
    { title: "Rent receipts", status: "pending" as const },
  ],
};

function fakeTransport(fail?: Error) {
  const sent: Parameters<MailTransport["sendMail"]>[0][] = [];
  const transport: MailTransport = {
    sendMail: vi.fn(async (message) => {
      if (fail) throw fail;
      sent.push(message);
      return {};
    }),
  };
  return { transport, sent };
}

function deps(overrides: Partial<ReminderDeps> = {}, claim: ClaimResult = { result: "ok", log_id: "log1", previous: null }) {
  const { transport, sent } = fakeTransport();
  const release = vi.fn(async () => {});
  return {
    sent,
    release,
    deps: {
      ownerId: "owner",
      checklistId: "c1",
      baseUrl: "https://chasely.test",
      demoOverride: undefined,
      from: "Chasely <sender@example.com>",
      replyTo: "accountant@example.com",
      claim: vi.fn(async () => claim),
      release,
      load: vi.fn(async () => checklist),
      transport,
      ...overrides,
    } satisfies ReminderDeps,
  };
}

describe("reminder email content", () => {
  const email = buildReminderEmail(
    {
      clientName: checklist.client_name,
      dueDate: checklist.due_date,
      outstandingTitles: ["Bank statements & <script>alert(1)</script>", "Rent receipts"],
      clientUrl: "https://chasely.test/c/tok_abc",
    },
    { to: "ravi@example.com", demoFor: null },
  );

  it("has a plain subject with the due date", () => {
    expect(email.subject).toBe("Documents still needed for 15 December 2026");
  });

  it("lists outstanding titles, the due date and the private link in both versions", () => {
    for (const body of [email.text, email.html]) {
      expect(body).toContain("Rent receipts");
      expect(body).toContain("15 December 2026");
      expect(body).toContain("https://chasely.test/c/tok_abc");
    }
  });

  it("escapes everything in the HTML", () => {
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<b>Menon");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Bank statements &amp;");
    expect(escapeHtml(`"'<>&`)).toBe("&quot;&#39;&lt;&gt;&amp;");
  });

  it("sends to the demo inbox when the override is set, and says where it would have gone", () => {
    expect(resolveRecipient("ravi@example.com", " demo@example.com ")).toEqual({
      to: "demo@example.com",
      demoFor: "ravi@example.com",
    });
    expect(resolveRecipient("ravi@example.com", "")).toEqual({ to: "ravi@example.com", demoFor: null });
    const demo = buildReminderEmail(
      { clientName: "Ravi", dueDate: "2026-12-15", outstandingTitles: ["x"], clientUrl: "u" },
      { to: "demo@example.com", demoFor: "ravi@example.com" },
    );
    expect(demo.to).toBe("demo@example.com");
    expect(demo.subject).toBe("[Demo mode, would go to ravi@example.com] Documents still needed for 15 December 2026");
  });
});

describe("reminder flow", () => {
  it("sends one email with only items not yet received, and never client notes", async () => {
    const { deps: d, sent } = deps({
      load: vi.fn(async () => ({
        ...checklist,
        items: [...checklist.items, { title: "PAN card", status: "received" as const, client_note: "SECRET NOTE" }],
      })),
    });
    const outcome = await sendReminder(d);
    expect(outcome).toEqual({ ok: true, message: "Reminder sent to ravi@example.com." });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ravi@example.com");
    expect(sent[0].replyTo).toBe("accountant@example.com");
    expect(sent[0].text).not.toContain("Form 16");
    expect(sent[0].text).not.toContain("PAN card");
    expect(sent[0].text).not.toContain("SECRET NOTE");
    expect(sent[0].text).toContain("Rent receipts");
  });

  it("says plainly where a demo email went", async () => {
    const { deps: d, sent } = deps({ demoOverride: "demo@example.com" });
    const outcome = await sendReminder(d);
    expect(outcome).toEqual({
      ok: true,
      message: "Demo mode: sent to the demo inbox instead of ravi@example.com.",
    });
    expect(sent[0].to).toBe("demo@example.com");
  });

  it("releases the claim and shows a plain error when sending fails", async () => {
    const { transport } = fakeTransport(Object.assign(new Error("boom"), { code: "ECONNECTION" }));
    const { deps: d, release } = deps({ transport }, { result: "ok", log_id: "log1", previous: "2026-01-01T00:00:00Z" });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const outcome = await sendReminder(d);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.error).toContain("Nothing was sent");
    expect(release).toHaveBeenCalledWith("log1", "2026-01-01T00:00:00Z");
    // Only the error code is logged, never the message, body or link.
    expect(errors.mock.calls.flat().join(" ")).not.toContain("tok_abc");
    expect(errors.mock.calls.flat().join(" ")).not.toContain("boom");
    errors.mockRestore();
  });

  it("gives up on a mail server that never answers", async () => {
    const hanging: MailTransport = { sendMail: () => new Promise(() => {}) };
    const { deps: d, release } = deps({ transport: hanging });
    vi.useFakeTimers();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const pending = sendReminder(d);
    await vi.advanceTimersByTimeAsync(13_000);
    const outcome = await pending;
    vi.useRealTimers();
    errors.mockRestore();
    expect(outcome.ok).toBe(false);
    expect(release).toHaveBeenCalled();
  });

  it.each([
    ["no_email", "Reminders need a client email"],
    ["closed", "closed"],
    ["all_received", "already received"],
    ["account_cap", "5 reminders in the last 24 hours"],
    ["global_cap", "reminder limit for today"],
  ] as const)("refuses %s with a plain message and sends nothing", async (result, text) => {
    const { deps: d, sent } = deps({}, { result });
    const outcome = await sendReminder(d);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.error).toContain(text);
    expect(sent).toHaveLength(0);
  });

  it("says when the next reminder can go out", async () => {
    const { deps: d, sent } = deps({}, { result: "too_soon", next_at: "2026-11-08T09:00:00Z" });
    const outcome = await sendReminder(d);
    expect(outcome).toMatchObject({ ok: false, nextAt: "2026-11-08T09:00:00Z" });
    expect(sent).toHaveLength(0);
  });
});
