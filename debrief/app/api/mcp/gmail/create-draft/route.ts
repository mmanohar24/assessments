import { NextRequest, NextResponse } from "next/server";

type ActionItem = { title: string; owner?: string; dueDate?: string; priority?: string };
type Tone = "internal" | "client" | "executive";

function buildBody(params: {
  tone: Tone;
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  openQuestions: string[];
}): string {
  const { tone, summary, decisions, actionItems, openQuestions } = params;

  const decisionsBlock =
    decisions.length > 0
      ? `Decisions Made:\n${decisions.map((d) => `• ${d}`).join("\n")}`
      : "";

  const actionsBlock =
    actionItems.length > 0
      ? `Action Items:\n${actionItems
          .map((a) => {
            const owner = a.owner ? `@${a.owner}` : "Unassigned";
            const due = a.dueDate ? ` — Due ${a.dueDate}` : "";
            return `• ${owner} — ${a.title}${due}`;
          })
          .join("\n")}`
      : "";

  const questionsBlock =
    openQuestions.length > 0
      ? `Open Questions:\n${openQuestions.map((q) => `• ${q}`).join("\n")}`
      : "";

  if (tone === "internal") {
    return [
      summary,
      "",
      decisionsBlock,
      actionsBlock,
      questionsBlock,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (tone === "client") {
    return [
      "Hi,",
      "",
      "Thank you for your time today. Here is a summary of what we covered.",
      "",
      summary,
      "",
      decisionsBlock,
      actionsBlock,
      questionsBlock.length > 0
        ? `Items Requiring Follow-up:\n${openQuestions.map((q) => `• ${q}`).join("\n")}`
        : "",
      "",
      "Please let me know if you have any questions.",
      "",
      "Best regards",
    ]
      .filter((l) => l !== undefined)
      .join("\n");
  }

  // executive — brevity first
  const actionsSummary =
    actionItems.length > 0
      ? `Next Steps (${actionItems.length}):\n${actionItems
          .slice(0, 5)
          .map((a) => `• ${a.owner ? `${a.owner}: ` : ""}${a.title}`)
          .join("\n")}`
      : "";

  return [
    summary,
    "",
    decisionsBlock,
    actionsSummary,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildReminderBody(incompleteTasks: unknown[]): string {
  const tasks = incompleteTasks as ActionItem[];
  return [
    `48-hour follow-up: ${tasks.length} action item${tasks.length !== 1 ? "s" : ""} from this meeting ${tasks.length !== 1 ? "are" : "is"} still open.`,
    "",
    tasks.map((t) => `• ${t.owner ? `@${t.owner} — ` : ""}${t.title}`).join("\n"),
    "",
    "Please update the status in Notion when complete.",
  ].join("\n");
}

async function getGoogleAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Missing Google OAuth credentials: GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET are all required"
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(
      `Failed to refresh Google access token: ${data.error_description ?? data.error ?? JSON.stringify(data)}`
    );
  }

  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  const {
    to,
    subject,
    summary,
    decisions,
    actionItems,
    openQuestions,
    tone,
    isReminder,
    incompleteTasks,
  } = await req.json();

  let token: string;
  try {
    token = await getGoogleAccessToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const body = isReminder
    ? buildReminderBody(incompleteTasks ?? [])
    : buildBody({
        tone: (tone as Tone) ?? "internal",
        summary: summary ?? "",
        decisions: decisions ?? [],
        actionItems: actionItems ?? [],
        openQuestions: openQuestions ?? [],
      });

  const rawEmail = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    body,
  ].join("\r\n");

  const encoded = Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: { raw: encoded } }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorText = JSON.stringify(data);
    return NextResponse.json({ error: errorText }, { status: res.status });
  }

  return NextResponse.json({ draftId: data.id });
}
