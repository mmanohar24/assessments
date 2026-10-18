import { NextRequest, NextResponse } from "next/server";

// In-memory store for demo. Use Redis/KV in production.
const reviewStore = new Map<string, { extraction: unknown; meetingTitle?: string }>();

export async function POST(req: NextRequest) {
  const { runId, extraction, meetingTitle } = await req.json();
  reviewStore.set(runId, { extraction, meetingTitle });
  return NextResponse.json({ stored: true });
}

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get("runId");
  const entry = reviewStore.get(runId!) ?? null;
  return NextResponse.json({
    extraction: entry?.extraction ?? null,
    meetingTitle: entry?.meetingTitle ?? null,
  });
}
