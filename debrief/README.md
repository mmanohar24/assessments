# Debrief

A post-meeting agent that actually does something. You paste a transcript, it pulls out action items, scores the meeting, and you review everything before anything gets sent. Then it creates Notion tasks, drafts a Gmail recap, posts to Slack, and books a follow-up on your calendar.

The part that makes it interesting: it goes quiet for 48 hours using Vercel Workflow SDK's durable sleep, wakes up on its own, checks which Notion tasks are still open, and nudges people if nothing got done.

Built for the [Vercel Zero to Agent Hackathon](https://community.vercel.com/hackathons/zero-to-agent), May 2026.

**Live:** [debrief-mu.vercel.app](https://debrief-mu.vercel.app)

---

## What it does

1. Paste a meeting transcript or pull from Granola
2. Claude extracts action items, decisions, open questions, and scores meeting efficiency
3. You review and edit everything before anything is dispatched
4. On approval, it creates Notion tasks, drafts a Gmail recap, posts a Slack summary, and books a calendar follow-up
5. 48 hours later, WDK wakes the workflow back up, checks Notion for incomplete tasks, and sends reminders if anything is still open

---

## Stack

- **Framework:** Next.js 15 (App Router)
- **Workflow:** Vercel Workflow SDK (WDK) — durable sleep, step functions
- **AI:** Anthropic Claude via AI SDK (`claude-sonnet-4-6`)
- **Integrations:** Notion REST API, Gmail REST API, Slack Web API, Google Calendar REST API, Granola MCP
- **Deployment:** Vercel

---

## Running locally

Clone the repo and install dependencies:

```bash
git clone https://github.com/mmanohar24/debrief.git
cd debrief
npm install
npx workflow@latest
```

Create a `.env.local` file with the following:

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ANTHROPIC_API_KEY=your_anthropic_api_key
NOTION_API_KEY=your_notion_integration_token
NOTION_PAGE_ID=your_notion_database_id
SLACK_BOT_TOKEN=your_slack_bot_token
DEFAULT_SLACK_CHANNEL_ID=your_slack_channel_id
NEXT_PUBLIC_DEFAULT_SLACK_CHANNEL_ID=your_slack_channel_id
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
CRON_SECRET=any_random_string
```

Then start the dev server:

```bash
npm run dev
```

---

## Setting up integrations

**Notion**
Create an integration at [notion.so/profile/integrations](https://www.notion.so/profile/integrations), create a database with these properties: `Owner` (title), `Due Date` (date), `Priority` (select), `Meeting` (rich_text). Share the database with your integration.

**Slack**
Create an app at [api.slack.com/apps](https://api.slack.com/apps), add `chat:write` and `chat:write.public` scopes, install to your workspace.

**Gmail + Google Calendar**
Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com), enable Gmail API and Google Calendar API, get a refresh token via [OAuth Playground](https://developers.google.com/oauthplayground) with `gmail.compose` and `calendar` scopes.

---

## How the 48hr sleep works

Standard serverless functions time out after seconds. The follow-up check needs to run 48 hours after a meeting — not immediately.

Vercel Workflow SDK handles this with a `sleep()` call inside a `"use workflow"` function. The workflow pauses, survives deploys and crashes, and resumes exactly when needed. No cron jobs, no queues to manage.

```typescript
"use workflow";

// ... dispatch steps ...

await sleep(48 * 60 * 60 * 1000); // 48 hours

// Check Notion, send reminders if tasks are still open
```

---

## Project structure

```
app/
  api/
    process-meeting/      # Starts the WDK workflow
    workflow-status/      # Polls run status
    review/               # Review gate store + approve
    mcp/
      notion/             # Notion REST API
      gmail/              # Gmail REST API
      slack/              # Slack Web API
      calendar/           # Google Calendar REST API
      granola/            # Granola MCP
    patterns/             # Recurring topic detection
  run/[runId]/            # Live run dashboard
  page.tsx                # Home page
components/
  ReviewGate.tsx          # Editable action items before dispatch
  ScoreCard.tsx           # Meeting efficiency score
workflows/
  debrief/                # Main post-meeting WDK workflow
  pre-meeting-briefing/   # Pre-meeting context workflow
lib/
  mcp.ts                  # Shared MCP helper (JSON-RPC 2.0)
```

---

## Demo

[Watch the 56 second demo](https://youtu.be/bbxYsZLYSuU)
