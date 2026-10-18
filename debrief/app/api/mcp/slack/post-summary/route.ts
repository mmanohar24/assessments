import { NextRequest, NextResponse } from "next/server";

type ActionItem = { title: string; owner?: string; dueDate?: string };

function buildSlackMessage(params: {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
}): string {
  const { summary, decisions, actionItems } = params;

  const lines: string[] = [summary];

  if (decisions.length > 0) {
    lines.push("");
    lines.push("*Decisions Made*");
    decisions.forEach((d) => lines.push(`• ${d}`));
  }

  if (actionItems.length > 0) {
    lines.push("");
    lines.push("*Action Items*");
    actionItems.forEach((a) => {
      const owner = a.owner ? `@${a.owner} — ` : "";
      const due = a.dueDate ? ` _(due ${a.dueDate})_` : "";
      lines.push(`• ${owner}${a.title}${due}`);
    });
  }

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const { summary, decisions, actionItems, channel } = await req.json();

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "SLACK_BOT_TOKEN not configured" }, { status: 503 });
  }

  const targetChannel = channel ?? process.env.DEFAULT_SLACK_CHANNEL_ID;
  if (!targetChannel) {
    return NextResponse.json({ error: "No channel provided and DEFAULT_SLACK_CHANNEL_ID not configured" }, { status: 400 });
  }

  const text = buildSlackMessage({
    summary: summary ?? "",
    decisions: decisions ?? [],
    actionItems: actionItems ?? [],
  });

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: targetChannel, text }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    const errorText = data.error ?? JSON.stringify(data);
    console.error("[slack/post-summary] Slack API error:", errorText, "| channel:", targetChannel);
    return NextResponse.json({ error: errorText }, { status: res.ok ? 400 : res.status });
  }

  return NextResponse.json({ ok: true, ts: data.ts });
}
