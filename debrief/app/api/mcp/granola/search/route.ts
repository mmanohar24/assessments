import { NextRequest, NextResponse } from "next/server";
import { callMCP } from "@/lib/mcp";

interface GranolaMeeting {
  title?: string;
  summary?: string;
  actionItems?: string[];
  date?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  const { query, attendees, limit } = await req.json();

  const token = process.env.GRANOLA_API_KEY;
  if (!token) {
    return NextResponse.json({ error: "GRANOLA_API_KEY not configured" }, { status: 503 });
  }

  const result = await callMCP(
    "https://mcp.granola.ai/mcp",
    "search_meetings",
    {
      query: query ?? "",
      attendees: attendees ?? [],
      limit: limit ?? 10,
    },
    token
  );

  // Normalize the response to a plain array regardless of whether the MCP
  // server returns { meetings: [...] } or [...] directly.
  let meetings: GranolaMeeting[];
  if (Array.isArray(result)) {
    meetings = result as GranolaMeeting[];
  } else {
    const obj = result as { meetings?: GranolaMeeting[] };
    meetings = obj.meetings ?? [];
  }

  return NextResponse.json(meetings);
}
