# DEBRIEF — Claude Code Implementation Spec
### Vercel "Zero to Agent" Hackathon · Track: Vercel Workflow (WDK) + v0 + MCPs

---

## 0. Before You Start (Required Setup)

Run these in your project root before touching any code:

```bash
# Install AI SDK skill for accurate code generation
npx skills add vercel/ai-sdk

# Install WDK skill for Workflow patterns
npx skills add vercel/workflow

# Feed full AI SDK docs to your context
curl https://ai-sdk.dev/llms.txt > llms.txt
# Tell Claude Code: "Read llms.txt before writing any AI SDK code"
```

Get a **Vercel AI Gateway API key** at: https://vercel.com/ai-gateway
Store it as `GATEWAY_API_KEY` in `.env.local`

---

## 1. What We're Building

**Debrief** is an autonomous post-meeting agent. It watches for completed meetings, extracts every action item and decision, then populates Notion, Google Calendar, Gmail, and Slack — automatically.

Beyond the post-meeting workflow, Debrief does four things no existing tool does:

- **Pre-Meeting Briefing** — Before a meeting starts, Debrief automatically pulls context from Notion and past Granola meetings on the same topic, then sends a Slack briefing: *"You're meeting about Project X in 10 minutes. Last time, Sarah was supposed to deliver the revised deck. It's still marked incomplete in Notion."* The previous meeting's follow-up feeds directly into the next one.

- **Recurring Pattern Detection** — If the same topic, blocker, or unresolved question appears across 3+ meetings, Debrief surfaces a flag: *"'Budget approval' has appeared in 4 consecutive meetings with no resolution. Consider escalating."* This is cross-meeting intelligence that Granola explicitly cannot do — each meeting exists in isolation in Granola. WDK makes this natural since run history is persistent.

- **Review Before Dispatch** — Before anything is sent to Notion, Calendar, Gmail, or Slack, the user sees a single review screen showing everything Claude extracted. They can edit action items, change owners, adjust due dates. One "Approve & Send" dispatches everything simultaneously. Human-reviewed automation, not blind automation.

- **Meeting Score Card** — After processing, a simple intelligence card shows: Meeting Efficiency %, number of decisions made, action items generated, and estimated time-to-value. Makes the output feel like genuine intelligence rather than a task list. Visually impressive in the demo.

The killer WDK feature: **48-hour durable follow-up**. After creating Notion tasks, Debrief pauses using WDK's durable sleep, wakes up 48 hours later, checks if tasks are still incomplete, and fires reminders if they are. A regular serverless function times out in seconds. WDK makes this trivial.

**One-line pitch:** "Your meeting ends. Debrief handles everything else — before, during, and after."

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Workflow/Durability | Vercel Workflow SDK (`workflow`, `@workflow/ai`) |
| AI | Vercel AI Gateway → `anthropic/claude-sonnet-4-6` |
| UI Scaffolding | v0 (use $30 credit for initial UI generation) |
| Styling | Tailwind CSS + custom CSS variables |
| MCPs | Granola, Notion, Google Calendar, Gmail, Slack |
| Deployment | Vercel (deploy after first working feature) |

---

## 3. Project Setup

```bash
# Scaffold
npx create-next-app@latest debrief --no-src-dir --typescript --tailwind --app

cd debrief

# Add WDK
npx workflow@latest

# Wrap next.config in withWorkflow (WDK will prompt this automatically)
# Verify next.config.ts contains: export default withWorkflow(nextConfig)

# Install dependencies
npm i workflow @workflow/ai ai @ai-sdk/react zod
npm i @radix-ui/react-tabs @radix-ui/react-badge lucide-react
npm i date-fns
```

### .env.local
```bash
GATEWAY_API_KEY=your_vercel_gateway_key_here

# MCP OAuth tokens — these are injected automatically when using Claude.ai MCP
# connections, but for standalone deployment you'll need:
GRANOLA_API_KEY=
NOTION_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SLACK_BOT_TOKEN=
```

---

## 4. Architecture Overview

```
── PRE-MEETING (triggered by Calendar MCP) ──────────────────────────
[WDK Scheduled Workflow] — pre-meeting-briefing.ts
  Step 0a: Detect upcoming meeting (15 min before) via Google Calendar MCP
  Step 0b: Query past Granola meetings on same topic/attendees
  Step 0c: Check Notion for incomplete tasks from last related meeting
  Step 0d: Generate briefing via Claude → post to Slack
        ↓
── POST-MEETING ─────────────────────────────────────────────────────
User uploads transcript (or Granola pulls it automatically)
        ↓
[Next.js API Route] /api/process-meeting
        ↓
[WDK Workflow] "use workflow" — debrief-workflow.ts
        ↓
  Step 1: Extract action items, decisions, patterns via Claude (AI Gateway)
  Step 1b: Generate Meeting Score Card (efficiency %, decisions, action items)
  Step 2: [REVIEW GATE] — pause, show user review screen, wait for approval
  Step 3: Create Notion tasks (Notion MCP)
  Step 4: Add Calendar follow-up event (Google Calendar MCP)
  Step 5: Draft Gmail recap — tone-aware (Gmail MCP)
  Step 6: Post Slack summary (Slack MCP)
  Step 7: Detect recurring patterns across past meetings
  Step 8: sleep(48 * 60 * 60 * 1000)  ← THE WDK MOMENT
  Step 9: Check Notion task completion status
  Step 10: If incomplete → send Slack reminder + Gmail nudge
        ↓
[Frontend Dashboard] Shows live status, score card, review gate, countdown
```

---

## 5. Core Files to Build

### 5.1 The WDK Workflows

There are now **two** WDK workflow files. Build them in this order.

---

#### Workflow A — `workflows/pre-meeting-briefing/index.ts`
Runs automatically 15 minutes before every meeting. Checks for context from past meetings and incomplete Notion tasks, then posts a Slack briefing.

```typescript
"use workflow";

import { step } from "workflow";
import { generateText } from "ai";
import { gateway } from "@workflow/ai/gateway";

export interface PreMeetingInput {
  meetingTitle: string;
  attendees: string[];
  meetingId: string;
  slackChannelId: string;
  scheduledTime: string;
}

export async function preMeetingBriefingWorkflow(input: PreMeetingInput) {
  // ── STEP 1: Pull past meetings on same topic from Granola ──
  const pastMeetings = await step("fetch-past-meetings", async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/granola/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input.meetingTitle,
        attendees: input.attendees,
        limit: 3,
      }),
    });
    return res.json(); // returns array of { title, summary, actionItems, date }
  });

  // ── STEP 2: Check Notion for incomplete tasks from past meetings ──
  const incompletePriorTasks = await step("fetch-incomplete-tasks", async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/notion/search-incomplete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        relatedMeetingTitle: input.meetingTitle,
        attendees: input.attendees,
      }),
    });
    return res.json(); // returns array of { title, owner, dueDate, status }
  });

  // ── STEP 3: Generate briefing via Claude ──
  const briefing = await step("generate-briefing", async () => {
    const { text } = await generateText({
      model: gateway("anthropic/claude-sonnet-4-6"),
      prompt: `You are a concise meeting preparation assistant. Generate a short pre-meeting briefing (max 5 bullet points) for Slack.

Meeting: ${input.meetingTitle}
Attendees: ${input.attendees.join(", ")}
Scheduled: ${input.scheduledTime}

Past meetings on this topic:
${JSON.stringify(pastMeetings, null, 2)}

Incomplete action items from prior meetings:
${JSON.stringify(incompletePriorTasks, null, 2)}

Format as Slack markdown. Be direct and specific. If there are incomplete tasks, call them out by owner name. Start with "📋 *Pre-meeting brief for ${input.meetingTitle}*"`,
    });
    return text;
  });

  // ── STEP 4: Post briefing to Slack ──
  await step("post-slack-briefing", async () => {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/slack/post-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: input.slackChannelId,
        message: briefing,
        isBriefing: true,
      }),
    });
  });

  return { briefing, incompletePriorTasks, pastMeetingsFound: pastMeetings.length };
}
```

---

#### Workflow B — `workflows/debrief/index.ts`
The main post-meeting workflow. Now includes Review Gate, Score Card, and Pattern Detection.

```typescript
"use workflow";

import { step, sleep, waitForEvent } from "workflow";
import { generateObject, generateText } from "ai";
import { gateway } from "@workflow/ai/gateway";
import { z } from "zod";

const MeetingExtractionSchema = z.object({
  summary: z.string().describe("2-3 sentence meeting summary"),
  decisions: z.array(z.string()).describe("Key decisions made"),
  actionItems: z.array(z.object({
    title: z.string(),
    owner: z.string().optional(),
    dueDate: z.string().optional().describe("ISO date string if mentioned"),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
  })),
  followUpDate: z.string().optional().describe("Suggested follow-up date if mentioned"),
  openQuestions: z.array(z.string()),
  // Score card fields
  meetingEfficiencyScore: z.number().min(0).max(100).describe("0-100 score: were decisions made, was time well spent?"),
  scoreRationale: z.string().describe("One sentence explaining the score"),
  recurringTopics: z.array(z.string()).describe("Topics that seem to recur — blockers, unanswered questions, same people"),
});

export type MeetingExtraction = z.infer<typeof MeetingExtractionSchema>;

export interface DebriefInput {
  meetingTitle: string;
  transcript: string;
  attendees: string[];
  notionPageId?: string;
  slackChannelId?: string;
  recipientEmail?: string;
  emailTone?: "internal" | "client" | "executive"; // tone-aware email
  runId: string; // needed for review gate event
}

export async function debriefWorkflow(input: DebriefInput) {
  // ── STEP 1: Extract structured data + score card ──
  const extraction = await step("extract-meeting-data", async () => {
    const result = await generateObject({
      model: gateway("anthropic/claude-sonnet-4-6"),
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
  });

  // ── STEP 2: REVIEW GATE — wait for user approval before dispatching ──
  // WDK's waitForEvent pauses the workflow until the frontend sends approval.
  // The review screen shows the full extraction and lets the user edit before approving.
  const approvedExtraction = await step("wait-for-review", async () => {
    // Store extraction in a temp key so the frontend can display it
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/review/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: input.runId, extraction }),
    });

    // Wait for user to approve (or edit + approve) via the review screen
    // Frontend calls /api/review/approve with runId + (optionally edited) extraction
    const event = await waitForEvent(`review-approved-${input.runId}`, {
      timeout: 30 * 60 * 1000, // 30 min timeout — if no response, auto-approve
    });

    // event.data contains the user's (possibly edited) version of extraction
    return (event?.data as MeetingExtraction) ?? extraction;
  });

  // ── STEP 3: Create Notion tasks (using approved extraction) ──
  const notionTaskIds = await step("create-notion-tasks", async () => {
    const taskIds: string[] = [];
    for (const item of approvedExtraction.actionItems) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/notion/create-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          owner: item.owner,
          dueDate: item.dueDate,
          priority: item.priority,
          meetingTitle: input.meetingTitle,
          notionPageId: input.notionPageId,
        }),
      });
      const { taskId } = await res.json();
      taskIds.push(taskId);
    }
    return taskIds;
  });

  // ── STEP 4: Create Calendar follow-up event ──
  await step("create-calendar-event", async () => {
    if (!approvedExtraction.followUpDate) return null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/calendar/create-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Follow-up: ${input.meetingTitle}`,
        date: approvedExtraction.followUpDate,
        attendees: input.attendees,
        description: approvedExtraction.summary,
      }),
    });
    return res.json();
  });

  // ── STEP 5: Draft tone-aware Gmail recap ──
  await step("draft-gmail-recap", async () => {
    if (!input.recipientEmail) return null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/gmail/create-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: input.recipientEmail,
        subject: `Meeting Recap: ${input.meetingTitle}`,
        summary: approvedExtraction.summary,
        decisions: approvedExtraction.decisions,
        actionItems: approvedExtraction.actionItems,
        openQuestions: approvedExtraction.openQuestions,
        tone: input.emailTone ?? "internal", // internal | client | executive
      }),
    });
    return res.json();
  });

  // ── STEP 6: Post Slack summary ──
  await step("post-slack-summary", async () => {
    if (!input.slackChannelId) return null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/slack/post-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: input.slackChannelId,
        meetingTitle: input.meetingTitle,
        summary: approvedExtraction.summary,
        actionItems: approvedExtraction.actionItems,
        decisions: approvedExtraction.decisions,
        scoreCard: {
          score: approvedExtraction.meetingEfficiencyScore,
          rationale: approvedExtraction.scoreRationale,
        },
      }),
    });
    return res.json();
  });

  // ── STEP 7: Recurring Pattern Detection ──
  // Queries past Granola meetings for the same recurring topics Claude flagged.
  // If a topic appears 3+ times, posts a pattern alert to Slack.
  const patternAlerts = await step("detect-recurring-patterns", async () => {
    if (approvedExtraction.recurringTopics.length === 0) return [];

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/patterns/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topics: approvedExtraction.recurringTopics,
        meetingTitle: input.meetingTitle,
        attendees: input.attendees,
      }),
    });
    const { alerts } = await res.json();

    // Post any pattern alerts to Slack
    if (alerts.length > 0 && input.slackChannelId) {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/slack/post-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: input.slackChannelId,
          isPatternAlert: true,
          alerts,
        }),
      });
    }
    return alerts;
  });

  // ── STEP 8: THE WDK KILLER FEATURE — Durable 48hr sleep ──
  await sleep(48 * 60 * 60 * 1000);

  // ── STEP 9: Check Notion task completion ──
  const incompleteTasks = await step("check-task-completion", async () => {
    const incomplete = [];
    for (const taskId of notionTaskIds) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/notion/get-task?id=${taskId}`
      );
      const task = await res.json();
      if (task.status !== "Done" && task.status !== "Complete") {
        incomplete.push(task);
      }
    }
    return incomplete;
  });

  // ── STEP 10: Send reminders if tasks are still open ──
  if (incompleteTasks.length > 0) {
    await step("send-reminders", async () => {
      if (input.slackChannelId) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/slack/post-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: input.slackChannelId,
            meetingTitle: input.meetingTitle,
            isReminder: true,
            incompleteTasks,
          }),
        });
      }
      if (input.recipientEmail) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/gmail/create-draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: input.recipientEmail,
            subject: `⚠️ 48hr Check-in: ${incompleteTasks.length} items still open from "${input.meetingTitle}"`,
            isReminder: true,
            incompleteTasks,
          }),
        });
      }
    });
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
```

---

### 5.2 API Routes

#### `app/api/process-meeting/route.ts`
Kicks off the main WDK workflow.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { run } from "workflow";
import { debriefWorkflow } from "@/workflows/debrief";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const runId = uuid();

  const workflowRun = await run(debriefWorkflow, {
    runId,
    meetingTitle: body.meetingTitle,
    transcript: body.transcript,
    attendees: body.attendees || [],
    notionPageId: body.notionPageId,
    slackChannelId: body.slackChannelId,
    recipientEmail: body.recipientEmail,
    emailTone: body.emailTone ?? "internal",
  });

  return NextResponse.json({ runId, workflowRunId: workflowRun.id, status: "started" });
}
```

#### `app/api/workflow-status/[runId]/route.ts`
Polls workflow progress for the dashboard.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getStatus } from "workflow";

export async function GET(req: NextRequest, { params }: { params: { runId: string } }) {
  const status = await getStatus(params.runId);
  return NextResponse.json(status);
}
```

#### `app/api/review/store/route.ts` *(NEW — Review Gate)*
Stores extraction temporarily so the frontend review screen can display it.

```typescript
import { NextRequest, NextResponse } from "next/server";

// In-memory store for demo. Use Redis/KV in production.
const reviewStore = new Map<string, unknown>();

export async function POST(req: NextRequest) {
  const { runId, extraction } = await req.json();
  reviewStore.set(runId, extraction);
  return NextResponse.json({ stored: true });
}

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get("runId");
  const extraction = reviewStore.get(runId!);
  return NextResponse.json({ extraction });
}
```

#### `app/api/review/approve/route.ts` *(NEW — Review Gate)*
Called by the frontend when the user clicks "Approve & Send". Fires the WDK event that resumes the workflow.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sendEvent } from "workflow";

export async function POST(req: NextRequest) {
  const { runId, extraction } = await req.json();
  // Sends the event that unblocks waitForEvent in the workflow
  await sendEvent(`review-approved-${runId}`, { data: extraction });
  return NextResponse.json({ approved: true });
}
```

#### `app/api/patterns/check/route.ts` *(NEW — Pattern Detection)*
Checks if flagged topics appear across past Granola meetings.

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { topics, meetingTitle, attendees } = await req.json();

  const alerts = [];
  for (const topic of topics) {
    // Search Granola for this topic across past meetings
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/granola/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: topic, attendees, limit: 10 }),
    });
    const meetings = await res.json();

    // If this topic appears in 3+ meetings, flag it
    if (meetings.length >= 3) {
      alerts.push({
        topic,
        occurrences: meetings.length,
        firstSeen: meetings[meetings.length - 1].date,
        message: `"${topic}" has come up in ${meetings.length} meetings without resolution. Consider escalating.`,
      });
    }
  }

  return NextResponse.json({ alerts });
}
```

#### `app/api/pre-meeting/trigger/route.ts` *(NEW — Pre-Meeting Briefing)*
Called by a Vercel Cron job that checks Google Calendar every 15 minutes for upcoming meetings.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { run } from "workflow";
import { preMeetingBriefingWorkflow } from "@/workflows/pre-meeting-briefing";

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (check Authorization header)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch meetings starting in the next 15 minutes from Google Calendar MCP
  const calRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mcp/calendar/upcoming`, {
    method: "GET",
  });
  const { meetings } = await calRes.json();

  // Trigger pre-meeting workflow for each upcoming meeting
  for (const meeting of meetings) {
    await run(preMeetingBriefingWorkflow, {
      meetingTitle: meeting.title,
      attendees: meeting.attendees,
      meetingId: meeting.id,
      slackChannelId: process.env.DEFAULT_SLACK_CHANNEL_ID!,
      scheduledTime: meeting.startTime,
    });
  }

  return NextResponse.json({ triggered: meetings.length });
}
```

Add to `vercel.json` to schedule the cron:
```json
{
  "crons": [{
    "path": "/api/pre-meeting/trigger",
    "schedule": "*/15 * * * *"
  }]
}
```

#### Additional MCP Bridge Routes
Create these for each service (same `callMCP` pattern from Section 6):

- `app/api/mcp/notion/create-task/route.ts`
- `app/api/mcp/notion/get-task/route.ts`
- `app/api/mcp/notion/search-incomplete/route.ts` *(NEW — for pre-meeting briefing)*
- `app/api/mcp/calendar/create-event/route.ts`
- `app/api/mcp/calendar/upcoming/route.ts` *(NEW — for pre-meeting cron)*
- `app/api/mcp/gmail/create-draft/route.ts`
- `app/api/mcp/slack/post-summary/route.ts`
- `app/api/mcp/granola/search/route.ts` *(NEW — for pattern detection + pre-meeting)*
- `app/api/granola/latest/route.ts` *(pulls latest meeting for manual trigger)*

---

### 5.3 Frontend — The Dashboard

**Design Direction:** Dark, editorial, minimal — like a control room. Think terminal meets product dashboard. Use monospace for status/log lines, a refined sans-serif for headings. Charcoal backgrounds with sharp amber/green accent for active states. No purple gradients, no generic AI look.

**Font pairing:** `DM Mono` (status, logs, IDs) + `Instrument Serif` or `Fraunces` (headings)

#### Pages to build:

**`app/page.tsx` — Home / Process Meeting**
- Input section: paste transcript OR click "Pull from Granola" button
- Meeting title field
- Email tone selector: Internal / Client / Executive (3 buttons, default Internal)
- Optional fields: Notion page, Slack channel, recipient email (collapsible)
- "Run Debrief" CTA button
- On submit → calls `/api/process-meeting` → redirects to `/run/[runId]`

**`app/run/[runId]/page.tsx` — Live Run Dashboard**
This is the money page. The demo happens here. It now has two states: **Review** and **Dispatched**.

*State 1 — Review (shown after extraction completes, before dispatch):*
```
┌─────────────────────────────────────────────────┐
│  DEBRIEF                              RUN #a3f2  │
│  "Q2 Planning Meeting · Apr 25"                  │
├─────────────────────────────────────────────────┤
│  MEETING SCORE CARD                              │
│  ████████░░  78 / 100                            │
│  "Clear decisions made, 2 owners unassigned"     │
├─────────────────────────────────────────────────┤
│  ⚠ RECURRING PATTERN DETECTED                   │
│  "Budget approval" appeared in 4 meetings.       │
│  Consider escalating to leadership.              │
├─────────────────────────────────────────────────┤
│  REVIEW BEFORE DISPATCH                          │
│  Edit anything below, then approve to send.      │
│                                                  │
│  Action Items (4)          [+ Add item]          │
│  □ @sarah — Update pricing deck   [Apr 30] [✎]  │
│  □ @mike  — Schedule interviews   [May 2]  [✎]  │
│  □ @?     — Review competitor     [—]      [✎]  │
│  □ @sarah — Send revised roadmap  [—]      [✎]  │
│                                                  │
│  Decisions (2)                                   │
│  ✓ Launch date moved to May 15                  │
│  ✓ Feature X descoped from v1                   │
│                                                  │
│  Open Questions (1)                              │
│  ? Budget approval — waiting on finance          │
│                                                  │
│  Email Tone: [Internal] [Client] [Executive]     │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  ✓ Approve & Send to all destinations  │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

*State 2 — Dispatched (after user approves):*
```
┌─────────────────────────────────────────────────┐
│  ● Extract + Score Card        ✓ Complete        │
│    Score: 78/100 · 4 items · 2 decisions         │
│                                                  │
│  ● Review Gate                 ✓ Approved        │
│    Approved by user at 2:14 PM                   │
│                                                  │
│  ● Create Notion Tasks         ✓ Complete        │
│    4 tasks created → [View in Notion ↗]          │
│                                                  │
│  ● Calendar Event              ✓ Complete        │
│    Follow-up booked May 2 → [View ↗]            │
│                                                  │
│  ● Gmail Draft                 ✓ Complete        │
│    Internal tone · Draft ready → [Open ↗]       │
│                                                  │
│  ● Slack Summary               ✓ Complete        │
│    Posted to #product → [View ↗]               │
│                                                  │
│  ● Pattern Detection           ⚠ 1 Alert         │
│    "Budget approval" — 4 occurrences             │
│                                                  │
│  ◷ 48hr Follow-up Check        Sleeping...       │
│    Checks in 47h 32m · Apr 27 at 2:15 PM        │
└─────────────────────────────────────────────────┘
```

**`app/history/page.tsx` — Past Runs**
- List of all previous Debrief runs
- Status badge: Complete / Reviewing / Running / Follow-up Sent / Pattern Alert
- Score card column showing meeting efficiency % per run
- Click to view individual run

---

### 5.4 Key Components

Build these as separate components:

- `components/StepTracker.tsx` — animated pipeline showing each WDK step, polls `/api/workflow-status/[runId]` every 3s
- `components/ReviewGate.tsx` — *(NEW)* editable action item list with Approve & Send button; calls `/api/review/approve` on confirm
- `components/ScoreCard.tsx` — *(NEW)* circular or bar score display with efficiency %, decision count, action item count, rationale text
- `components/PatternAlert.tsx` — *(NEW)* amber warning banner showing recurring topic, occurrence count, and escalation suggestion
- `components/ExtractionCard.tsx` — displays decisions, open questions from Claude's extraction
- `components/TranscriptInput.tsx` — textarea + Granola pull button + email tone selector
- `components/RunHistory.tsx` — table of past runs with score column and status badges

---

## 6. MCP Integration Pattern

Use this pattern consistently for all MCP calls from your API bridge routes:

```typescript
// Pattern for any MCP tool call
async function callMCP(serverUrl: string, toolName: string, args: Record<string, unknown>, token: string) {
  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: crypto.randomUUID(),
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });
  
  const data = await response.json();
  
  // MCP responses have this structure:
  // data.result.content[0].text → the actual result
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.result.content[0].text);
}

// Usage examples:
// Notion: callMCP("https://mcp.notion.com/mcp", "notion-create-pages", {...}, NOTION_TOKEN)
// Granola: callMCP("https://mcp.granola.ai/mcp", "list_meetings", {...}, GRANOLA_TOKEN)  
// Gmail: callMCP("https://gmailmcp.googleapis.com/mcp/v1", "create_draft", {...}, GOOGLE_TOKEN)
// Calendar: callMCP("https://calendarmcp.googleapis.com/mcp/v1", "create_event", {...}, GOOGLE_TOKEN)
// Slack: callMCP("https://mcp.slack.com/mcp", "slack_post_message", {...}, SLACK_TOKEN)
```

---

## 7. Build Order (Day by Day)

Follow this exact order. Do not skip ahead. Tier 1 features are woven in at the right points — not bolted on at the end.

### Day 1 (today) — Foundation
- [ ] `npx create-next-app@latest debrief`
- [ ] `npx workflow@latest` — install and configure WDK
- [ ] Get Vercel AI Gateway key, add to `.env.local`
- [ ] Write the main WDK workflow file (`workflows/debrief/index.ts`) — full version with Review Gate, Score Card, Pattern Detection steps
- [ ] Write `/api/process-meeting` route
- [ ] Test: call the workflow with a hardcoded transcript, verify it runs and hits the waitForEvent pause

### Day 2 — Extraction + Score Card
- [ ] Verify Claude extraction returns clean JSON via `generateObject` — including `meetingEfficiencyScore` and `recurringTopics`
- [ ] Build `/api/workflow-status/[runId]` polling route
- [ ] Build `/api/review/store` and `/api/review/approve` routes
- [ ] Build minimal placeholder UI — transcript input + submit button
- [ ] Test: paste transcript → workflow starts → extraction logged → workflow pauses at Review Gate

### Day 3 — Review Gate UI + Notion
- [ ] Build `ReviewGate` component — editable action items, Approve & Send button
- [ ] Build `ScoreCard` component — score bar, rationale text
- [ ] Wire review screen to `/api/review/approve` — verify workflow resumes on approval
- [ ] Build `/api/mcp/notion/create-task` bridge route
- [ ] Test: approve review → Notion tasks appear

### Day 4 — Calendar + Gmail + Pattern Detection
- [ ] Build `/api/mcp/calendar/create-event`
- [ ] Build `/api/mcp/gmail/create-draft` with tone-aware prompt (internal/client/executive)
- [ ] Build `/api/patterns/check` route
- [ ] Build `/api/mcp/granola/search` bridge route
- [ ] Test: full pipeline through pattern detection fires correctly

### Day 5 — Slack + Full pipeline end-to-end
- [ ] Build `/api/mcp/slack/post-summary` (handles regular summary, score card, pattern alerts, reminders)
- [ ] Run full workflow end-to-end: transcript in → review → approve → all 5 outputs → pattern check
- [ ] Fix any broken steps

### Day 6 — Pre-Meeting Briefing
- [ ] Write `workflows/pre-meeting-briefing/index.ts`
- [ ] Build `/api/pre-meeting/trigger` cron route
- [ ] Build `/api/mcp/calendar/upcoming` and `/api/mcp/notion/search-incomplete` routes
- [ ] Add `vercel.json` cron config
- [ ] Test: trigger manually, verify Slack briefing posts with prior context

### Day 7 — Dashboard UI + Pattern Alert
- [ ] Use v0 to generate the run dashboard UI (use your $30 credit here — prompt it with the wireframe from Section 5.3)
- [ ] Build `StepTracker` with live polling, including Review Gate step state
- [ ] Build `PatternAlert` component — amber warning banner
- [ ] Build Granola "Pull from Granola" button
- [ ] Build history page with score column

### Day 8 — Polish + demo prep
- [ ] Handle edge cases: empty transcript, MCP auth failures, review timeout (auto-approve), pattern with no matches
- [ ] Fast Demo Mode toggle: 30-second sleep instead of 48hr
- [ ] Dark theme, typography, micro-animations on step tracker
- [ ] Deploy to Vercel production URL
- [ ] Record demo video

### Day 9 (May 3) — Submit
- [ ] Write submission copy (see Section 9)
- [ ] Submit before May 3, 11:59 PM PT
- [ ] Share in Vercel community for early votes

---

## 8. Demo Script

Practice this until it's 90 seconds:

1. **Open the live URL** — show the clean Debrief dashboard
2. **Show the Slack channel** — point out the pre-meeting briefing that arrived 15 minutes before the meeting: *"This is what Debrief sent before the meeting even started — context from the last time these people met, plus the tasks that were still open."*
3. **Click "Pull from Granola"** — latest meeting transcript loads automatically
4. **Select email tone** — click "Client" to show tone-aware output
5. **Click "Run Debrief"** — workflow starts, redirect to run page
6. **Score Card appears** — *"78 out of 100. Two action items had no owner assigned — Debrief flagged that."*
7. **Pattern Alert appears** — *"'Budget approval' came up in 4 consecutive meetings. Debrief caught that automatically by searching across past Granola meetings."*
8. **Show the Review Gate** — edit one action item live to show it's editable. Click "Approve & Send."
9. **Watch steps dispatch** — Notion, Calendar, Gmail, Slack all check off
10. **Point to the 48hr timer** — *"In 48 hours it wakes up, checks if these tasks are done in Notion, and sends reminders if they're not. No serverless function can survive 48 hours. This is WDK."*

That last line is your technical credibility moment with Vercel judges.

---

## 9. Submission Copy (Draft)

**Title:** Debrief — The Autonomous Post-Meeting Agent

**Description:**
> Debrief is a full-loop meeting intelligence agent built on Vercel Workflow SDK, AI SDK, and 5 MCP integrations. It works in three phases: before a meeting, it sends a Slack briefing with context from past meetings and incomplete action items. After a meeting, it extracts action items, decisions, and open questions via Claude — scores the meeting's efficiency, detects recurring patterns across your meeting history, lets you review and edit everything before dispatch, then creates Notion tasks, books Calendar follow-ups, drafts tone-aware Gmail recaps, and posts a Slack summary. Then it sleeps for 48 hours using WDK's durable workflow. When it wakes up, it checks Notion for incomplete tasks and sends reminders. The 48-hour sleep is genuinely impossible without WDK — standard serverless functions time out in seconds.

**Track:** Vercel Workflow (WDK)

**Stack:** Next.js 15 · Vercel Workflow SDK · AI Gateway (claude-sonnet-4-6) · MCPs: Granola, Notion, Google Calendar, Gmail, Slack

**What makes it genuinely WDK:**
Two things. First, the 48-hour durable sleep + follow-up check — impossible with serverless. Second, the pre-meeting briefing runs as a scheduled workflow triggered by Vercel Cron, querying Granola and Notion across past meetings to build context — a multi-step durable chain that persists across days, not seconds.

---

## 10. Flags and Risks

| Risk | Mitigation |
|---|---|
| MCP OAuth token management in production | Store all tokens as Vercel environment variables; use service accounts where available |
| WDK local dev is different from production | Deploy to Vercel early (Day 2), iterate on preview deployments |
| Granola MCP auth is underdocumented | Have a fallback: manual transcript paste always works |
| 48hr sleep hard to demo live | Fast Demo Mode toggle uses 30-second sleep for judging |
| Notion page ID required for task creation | Setup flow lets user pick target Notion database on first run |
| `waitForEvent` for Review Gate may have WDK limitations | Test on Day 2; fallback is auto-approve after 30 min timeout |
| Pre-meeting cron fires too frequently | Rate-limit to one briefing per meeting ID using a simple KV store |
| Pattern detection produces false positives | Only alert on 3+ occurrences; show the source meetings so user can verify |
| Granola search MCP may not support semantic queries | Fallback: keyword match on meeting titles using attendee names as filter |
| Score card feels arbitrary | Ground the rationale in Claude's explanation — show the "why" not just the number |

---

## 11. Useful Commands

```bash
# Run local dev
npm run dev

# Check WDK workflow status locally
npx workflow status

# Deploy to Vercel
vercel deploy

# Deploy to production
vercel deploy --prod

# Add AI SDK skill to Claude Code context
npx skills add vercel/ai-sdk

# View WDK logs
npx workflow logs [run-id]
```

---

*Built for Vercel Zero to Agent Hackathon · April 24 – May 3, 2026*
*Track: Vercel Workflow (WDK) + v0 + MCPs*
