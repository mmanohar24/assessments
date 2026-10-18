import { NextRequest, NextResponse } from "next/server";
import { getRun } from "workflow/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = getRun(runId);
  const status = await run.status;
  return NextResponse.json({ runId, status });
}
