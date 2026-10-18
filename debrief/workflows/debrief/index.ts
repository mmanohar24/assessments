import { sleep, createHook } from "workflow";
import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const anthropicModel = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})("claude-sonnet-4-6");

const MeetingExtractionSchema = z.object({
  summary: z.string().describe("2-3 sentence meeting summary"),
  decisions: z.array(z.string()).describe("Key decisions made"),
  actionItems: z.array(
    z.object({
      title: z.string(),
      owner: z.string().optional(),
      dueDate: z.string().optional().describe("ISO date string if mentioned"),
      priority: z.enum(["high", "medium", "low"]).default("medium"),
    })
  ),
  followUpDate: z.string().optional().describe("Suggested follow-up date if mentioned"),
  openQuestions: z.array(z.string()),
  meetingEfficiencyScore: z
    .number()
    .describe("0-100 score: were decisions made, was time well spent?"),
  scoreRationale: z.string().describe("One sentence explaining the score"),
  recurringTopics: z
    .array(z.string())
    .describe("Topics that seem to recur — blockers, unanswered questions, same people"),
});

export type MeetingExtraction = z.infer<typeof MeetingExtractionSchema>;

export interface DebriefInput {
  meetingTitle: string;
  transcript: string;
  attendees: string[];
  notionPageId?: string;
  slackChannelId?: string;
  recipientEmail?: string;
  emailTone?: "internal" | "client" | "executive";
  runId: string;
}

// ── Step functions (full Node.js / network access) ──────────────────────────

async function extractMeetingData(input: DebriefInput): Promise<MeetingExtraction> {
  "use step";
  try {
    const result = await generateObject({
      model: anthropicModel,
      schema: MeetingExtractionSchema,
      prompt: `You are an expert meeting analyst. Extract all action items, decisions, and key information.
Also score meeting efficiency (0-100): 100 = clear decisions made, owners assigned, time well spent. 0 = no decisions, vague outcomes, circular discussion.
Flag any topics that sound like they keep coming up without resolution.

Meeting Title: ${input.meetingTitle}
Attendees: ${input.attendees.join(", ")}
Transcript:
${input.transcript}`,
    });
    return result.object;
  } catch (err) {
    console.error("[extractMeetingData] generateObject failed:", err);
    throw err;
  }
}

async function storeExtractionForReview(
  runId: string,
  extraction: MeetingExtraction,
  meetingTitle: string
): Promise<void> {
  "use step";
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/review/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId, extraction, meetingTitle }),
  });
}

async function createNotionTasks(
  actionItems: MeetingExtraction["actionItems"],
  meetingTitle: string,
  notionPageId: string | undefined
): Promise<string[]> {
  "use step";
  const taskIds: string[] = [];
  for (const item of actionItems) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/notion/create-task`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          owner: item.owner,
          dueDate: item.dueDate,
          priority: item.priority,
          meetingTitle,
          notionPageId,
        }),
      }
    );
    const { taskId } = await res.json();
    taskIds.push(taskId);
  }
  return taskIds;
}

async function createCalendarEvent(
  extraction: MeetingExtraction,
  meetingTitle: string,
  attendees: string[]
): Promise<unknown> {
  "use step";
  if (!extraction.followUpDate) return null;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/calendar/create-event`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Follow-up: ${meetingTitle}`,
        date: extraction.followUpDate,
        attendees,
        description: extraction.summary,
      }),
    }
  );
  return res.json();
}

async function draftGmailRecap(
  extraction: MeetingExtraction,
  meetingTitle: string,
  recipientEmail: string,
  emailTone: string
): Promise<unknown> {
  "use step";
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/gmail/create-draft`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipientEmail,
        subject: `Meeting Recap: ${meetingTitle}`,
        summary: extraction.summary,
        decisions: extraction.decisions,
        actionItems: extraction.actionItems,
        openQuestions: extraction.openQuestions,
        tone: emailTone,
      }),
    }
  );
  return res.json();
}

async function postSlackSummary(
  extraction: MeetingExtraction,
  meetingTitle: string,
  slackChannelId: string
): Promise<unknown> {
  "use step";
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/slack/post-summary`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: slackChannelId,
        meetingTitle,
        summary: extraction.summary,
        actionItems: extraction.actionItems,
        decisions: extraction.decisions,
        scoreCard: {
          score: extraction.meetingEfficiencyScore,
          rationale: extraction.scoreRationale,
        },
      }),
    }
  );
  return res.json();
}

async function detectRecurringPatterns(
  recurringTopics: string[],
  meetingTitle: string,
  attendees: string[],
  slackChannelId: string | undefined
): Promise<unknown[]> {
  "use step";
  if (recurringTopics.length === 0) return [];
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/patterns/check`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: recurringTopics, meetingTitle, attendees }),
    }
  );
  const { alerts } = await res.json();
  if (alerts.length > 0 && slackChannelId) {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/slack/post-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: slackChannelId,
        isPatternAlert: true,
        alerts,
      }),
    });
  }
  return alerts;
}

async function checkNotionTaskCompletion(taskIds: string[]): Promise<unknown[]> {
  "use step";
  const incomplete = [];
  for (const taskId of taskIds) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/notion/get-task?id=${taskId}`
    );
    const task = await res.json();
    if (task.status !== "Done" && task.status !== "Complete") {
      incomplete.push(task);
    }
  }
  return incomplete;
}

async function sendReminders(
  incompleteTasks: unknown[],
  meetingTitle: string,
  slackChannelId: string | undefined,
  recipientEmail: string | undefined
): Promise<void> {
  "use step";
  if (slackChannelId) {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/slack/post-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: slackChannelId,
        meetingTitle,
        isReminder: true,
        incompleteTasks,
      }),
    });
  }
  if (recipientEmail) {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/gmail/create-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipientEmail,
        subject: `⚠️ 48hr Check-in: ${incompleteTasks.length} items still open from "${meetingTitle}"`,
        isReminder: true,
        incompleteTasks,
      }),
    });
  }
}

// ── Main workflow ────────────────────────────────────────────────────────────

export async function debriefWorkflow(input: DebriefInput) {
  "use workflow";

  // Step 1: Extract action items, decisions, patterns + score card via Claude
  const extraction = await extractMeetingData(input);

  // Step 2: REVIEW GATE — store extraction, then pause until frontend approves.
  // The approve route calls resumeHook with the deterministic token below.
  await storeExtractionForReview(input.runId, extraction, input.meetingTitle);
  const reviewHook = createHook<MeetingExtraction>({
    token: `review-${input.runId}`,
  });
  const approvedExtraction = (await reviewHook) ?? extraction;

  // Step 3: Create Notion tasks
  const notionTaskIds = await createNotionTasks(
    approvedExtraction.actionItems,
    input.meetingTitle,
    input.notionPageId
  );

  // Step 4: Add Calendar follow-up event (non-fatal)
  try {
    await createCalendarEvent(approvedExtraction, input.meetingTitle, input.attendees);
  } catch (err) {
    console.error("[debriefWorkflow] createCalendarEvent failed, continuing:", err);
  }

  // Step 5: Draft tone-aware Gmail recap (non-fatal)
  if (input.recipientEmail) {
    try {
      await draftGmailRecap(
        approvedExtraction,
        input.meetingTitle,
        input.recipientEmail,
        input.emailTone ?? "internal"
      );
    } catch (err) {
      console.error("[debriefWorkflow] draftGmailRecap failed, continuing:", err);
    }
  }

  // Step 6: Post Slack summary (non-fatal)
  if (input.slackChannelId) {
    try {
      await postSlackSummary(approvedExtraction, input.meetingTitle, input.slackChannelId);
    } catch (err) {
      console.error("[debriefWorkflow] postSlackSummary failed, continuing:", err);
    }
  }

  // Step 7: Detect recurring patterns across past meetings
  const patternAlerts = await detectRecurringPatterns(
    approvedExtraction.recurringTopics,
    input.meetingTitle,
    input.attendees,
    input.slackChannelId
  );

  // Step 8: THE WDK KILLER FEATURE — durable 48-hour sleep
  await sleep(48 * 60 * 60 * 1000);

  // Step 9: Check Notion task completion
  const incompleteTasks = await checkNotionTaskCompletion(notionTaskIds);

  // Step 10: Send reminders for any still-open tasks
  if (incompleteTasks.length > 0) {
    await sendReminders(
      incompleteTasks,
      input.meetingTitle,
      input.slackChannelId,
      input.recipientEmail
    );
  }

  return {
    extraction: approvedExtraction,
    notionTaskIds,
    patternAlerts,
    incompleteTasks,
    scoreCard: {
      score: approvedExtraction.meetingEfficiencyScore,
      rationale: approvedExtraction.scoreRationale,
    },
    status: "complete",
  };
}
