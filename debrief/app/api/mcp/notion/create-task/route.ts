import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { title, owner, dueDate, priority, meetingTitle } = await req.json();

  const token = process.env.NOTION_API_KEY;
  if (!token) {
    return NextResponse.json({ error: "NOTION_API_KEY not configured" }, { status: 503 });
  }

  const databaseId = process.env.NOTION_PAGE_ID;
  if (!databaseId) {
    return NextResponse.json({ error: "NOTION_PAGE_ID not configured" }, { status: 503 });
  }

  const properties: Record<string, unknown> = {
    Owner: {
      title: [{ text: { content: title ?? "" } }],
    },
    Priority: {
      select: { name: (priority as string) ?? "medium" },
    },
    Meeting: {
      rich_text: [{ text: { content: meetingTitle ?? "" } }],
    },
  };

  if (dueDate) {
    properties["Due Date"] = {
      date: { start: (dueDate as string).split("T")[0] },
    };
  }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const page = await res.json() as { id: string };
  return NextResponse.json({ taskId: page.id });
}
