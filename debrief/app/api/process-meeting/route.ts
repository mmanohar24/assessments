import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { debriefWorkflow } from "@/workflows/debrief";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const runId = uuid();

  const workflowRun = await start(debriefWorkflow, [
    {
      runId,
      meetingTitle: body.meetingTitle,
      transcript: body.transcript,
      attendees: body.attendees || [],
      notionPageId: body.notionPageId,
      slackChannelId: body.slackChannelId,
      recipientEmail: body.recipientEmail,
      emailTone: body.emailTone ?? "internal",
    },
  ]);

  // workflowRun.runId is the WDK-assigned ID (wrun_...) used for status polling.
  // runId (uuid) is our hook token seed, returned as hookId for the review gate.
  return NextResponse.json({
    runId: workflowRun.runId,
    hookId: runId,
    status: "started",
  });
}
