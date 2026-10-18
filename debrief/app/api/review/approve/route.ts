import { NextRequest, NextResponse } from "next/server";
import { resumeHook } from "workflow/api";
import type { MeetingExtraction } from "@/workflows/debrief";

export async function POST(req: NextRequest) {
  const { runId, extraction } = await req.json();
  // Resumes the createHook in the workflow, which was created with token `review-${runId}`
  await resumeHook<MeetingExtraction>(`review-${runId}`, extraction);
  return NextResponse.json({ approved: true });
}
