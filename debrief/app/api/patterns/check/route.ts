import { NextRequest, NextResponse } from "next/server";

interface PatternAlert {
  topic: string;
  occurrences: number;
  firstSeen: string | undefined;
  message: string;
}

interface GranolaMeeting {
  date?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  const { topics, meetingTitle, attendees } = await req.json();

  if (!Array.isArray(topics) || topics.length === 0) {
    return NextResponse.json({ alerts: [] });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const alerts: PatternAlert[] = [];

  for (const topic of topics as string[]) {
    const res = await fetch(`${base}/api/mcp/granola/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: topic, attendees, limit: 10 }),
    });

    if (!res.ok) continue;

    const meetings: GranolaMeeting[] = await res.json();

    if (meetings.length >= 3) {
      alerts.push({
        topic,
        occurrences: meetings.length,
        firstSeen: meetings[meetings.length - 1]?.date,
        message: `"${topic}" has come up in ${meetings.length} meetings without resolution. Consider escalating.`,
      });
    }
  }

  // Suppress unused-variable warning; meetingTitle may be used for future context filtering.
  void meetingTitle;

  return NextResponse.json({ alerts });
}
