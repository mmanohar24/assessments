# Project Rules for Claude Code

@AGENTS.md

## MANDATORY: Read DESIGN.md before writing any UI code

Before writing, editing, or generating any component, page, stylesheet, or
Tailwind class, you MUST read the DESIGN.md file in the project root.

```
cat DESIGN.md
```

This is not optional. Every UI decision — colors, fonts, spacing, border
radius, component variants, status indicators — must come from DESIGN.md.
Do not use default Tailwind colors, generic gray palettes, or Inter/system
fonts unless they are explicitly defined in DESIGN.md.

---

## Design System: Obsidian Terminal

The project uses the **Obsidian Terminal** design system. Key rules you must
internalize before touching any UI file:

### Colors — non-negotiable
- Page background: `#0D0F0E` (primary)
- Default surface (cards, panels): `#111311` (surface)
- Raised surface (interactive cards): `#161916` (surface-raised)
- Overlay (modals, dropdowns): `#1C1F1C` (surface-overlay)
- Default borders: `#242824` (border)
- Active/focus borders: `#2F3A30` (border-active)
- **Accent (the only true color): `#00E87A`** — used for primary CTA, live
  status, active agent state. One purpose per screen. Never decorative.
- Primary text: `#E8EDE8`
- Secondary text (labels, meta): `#8A9A8A`
- Tertiary text (disabled, ghost): `#4A5A4A`
- Text on accent backgrounds: `#001A0D`
- Info: `#4D9EFF` / Info surface: `#0A1F3D`
- Warning: `#F5A623` / Warning surface: `#2A1E00`
- Error: `#FF5C5C` / Error surface: `#2A0A0A`
- Success: `#00E87A` / Success surface: `#003D22`

**There is no light mode. Never use white or near-white backgrounds.**

### Typography — two fonts only
- **JetBrains Mono** — all headings, labels, status text, code output,
  any text that communicates system state. Negative letter-spacing on display.
- **Inter** — all body copy and prose-length descriptions only.
- Weights: 400 (Inter body) and 600–700 (Mono headings) only.
- Labels: always uppercase, `0.06em` letter-spacing, Mono font.
- Never use Inter for headings. Never use Mono for multi-line prose.

### Spacing
- Base grid: 8px
- Scale: xs=4px, sm=8px, md=16px, lg=24px, xl=40px, 2xl=64px
- Gutter: 24px. Max content width: 1200px (800px for single-column tools).

### Border radius
- Buttons, inputs, badges: 4px
- Cards, panels: 6px
- Pills and live status badges: 9999px (full)
- Never use 8px+ radius on rectangular containers.

### Elevation (no shadows — ever)
Depth is communicated through background color steps only:
1. Page: `#0D0F0E`
2. Surface: `#111311`
3. Raised: `#161916`
4. Overlay: `#1C1F1C`

The only allowed glow: `0 0 0 1px #00E87A33` on the single focused primary
element. Nowhere else.

---

## Component Patterns

### Buttons
- Primary: `bg-[#00E87A] text-[#001A0D]` — one per screen maximum.
- Secondary: `bg-transparent border border-[#00E87A] text-[#00E87A]`
- Ghost: `bg-transparent text-[#8A9A8A] hover:bg-[#161916]`
- All buttons: 4px radius, JetBrains Mono label font, uppercase.

### Cards
- Background: `#161916`, border: `1px solid #242824`, radius: 6px
- Hover: `#1C1F1C`, border: `#2F3A30`
- Transition: 120ms ease-out — nothing slower.

### Inputs
- Background: `#111311`, border: `1px solid #242824`
- Focus: border becomes `#2F3A30` — no box-shadow, no glow ring.

### Agent Log Panel (first-class component)
```
bg-[#0D0F0E] font-mono text-[#00E87A] rounded-[6px] p-4
```
- Active output lines: `#00E87A`
- Completed lines: `#8A9A8A`
- Streaming cursor: `▋` in `#00E87A`, CSS blink animation

### Status Badges
- Live/Active: green dot (pulsing) + "LIVE" — `bg-[#003D22] text-[#00E87A]`
- Running tool: `bg-[#0A1F3D] text-[#4D9EFF]`
- Warning: `bg-[#2A1E00] text-[#F5A623]`
- Error: `bg-[#2A0A0A] text-[#FF5C5C]`
- All badges: JetBrains Mono, uppercase, 2px radius.

---

## Hard Rules

1. **Read DESIGN.md first.** Always. No exceptions.
2. No white or light backgrounds. Ever.
3. Accent green (`#00E87A`) appears once per screen with one purpose.
4. No drop shadows, gradients, blur, or glassmorphism.
5. No generic Tailwind colors (gray-500, blue-600, etc.) — use exact hex.
6. No system fonts or Inter for headings.
7. Agent state must always be visually explicit: idle / running / complete / error
   must each look different without reading text.
8. Motion only communicates state change. No decorative animations.
9. Left-align all body content. Center-align only for empty states.
10. When in doubt, check DESIGN.md.

---

## Technical Architecture

### AI Provider
- Package: `@ai-sdk/anthropic` — `createAnthropic`
- Model: `claude-sonnet-4-6`
- Env var: `ANTHROPIC_API_KEY`
- Initialized once at module level in `workflows/debrief/index.ts` as `anthropicModel`

### Environment Variables
```
ANTHROPIC_API_KEY        # Anthropic direct API
NOTION_API_KEY           # Notion Integration Token (Bearer)
NOTION_PAGE_ID           # Target Notion database ID for task creation
GOOGLE_ACCESS_TOKEN      # OAuth access token for Calendar + Gmail MCP calls
GRANOLA_API_KEY          # Granola MCP Bearer token
SLACK_BOT_TOKEN          # Slack MCP Bearer token
NEXT_PUBLIC_BASE_URL     # Full origin URL (e.g. http://localhost:3000) — used by WDK steps for internal fetch calls
```

### Notion — Direct REST API (not MCP)
Notion MCP requires OAuth that isn't set up. All Notion calls use the REST API directly.

- Endpoint: `https://api.notion.com/v1/pages`
- Headers: `Authorization: Bearer ${NOTION_API_KEY}`, `Notion-Version: 2022-06-28`
- **Exact database schema** (4 properties, no others):
  - `Owner` — `title` type — holds the **task title** (primary field, required by Notion)
  - `Due Date` — `date` type — `{ start: "YYYY-MM-DD" }`, always strip time component
  - `Priority` — `select` type — values: `high`, `medium`, `low`
  - `Meeting` — `rich_text` type — meeting title string

### MCP Helper
`lib/mcp.ts` exports `callMCP(serverUrl, toolName, args, token)` — JSON-RPC 2.0 wrapper.
Use for: Calendar (`https://calendarmcp.googleapis.com/mcp/v1`), Gmail (`https://gmailmcp.googleapis.com/mcp/v1`), Granola (`https://mcp.granola.ai/mcp`), Slack (`https://mcp.slack.com/mcp`).
Do **not** use for Notion (direct REST instead).

### WDK Run Status
`getRun(runId).status` resolves to: `"pending" | "running" | "completed" | "failed" | "cancelled"`
There is no `"paused"` or `"waiting"` status — the run stays `"running"` while `createHook` waits.
Detect the Review Gate state by checking the review store (`/api/review/store?runId=`) for extraction data.

### Run Page URL Structure
`/run/[runId]?h=[hookId]`
- `runId` — WDK-assigned run ID (e.g. `wrun_…`), used for `/api/workflow-status/[runId]`
- `hookId` — UUID generated at submit time, used for `/api/review/store` and `/api/review/approve`
Both IDs are returned by `/api/process-meeting` as `{ runId, hookId }`.

### Font CSS Variables
- `--font-jetbrains-mono` — headings, labels, status, code, buttons
- `--font-inter` — body copy and prose only
Loaded in `app/layout.tsx` via `next/font/google`.

### What Is Built (Day 4 complete)
- `workflows/debrief/index.ts` — full WDK workflow with extraction, review gate, dispatch steps, 48hr sleep
- `app/page.tsx` — home page with demo helpers, Obsidian Terminal design
- `app/run/[runId]/page.tsx` — live dashboard with step tracker, ScoreCard, ReviewGate
- `components/ScoreCard.tsx`, `components/ReviewGate.tsx`
- `/api/process-meeting`, `/api/workflow-status/[runId]`, `/api/review/store`, `/api/review/approve`
- `/api/mcp/notion/create-task` (REST), `/api/mcp/calendar/create-event`, `/api/mcp/gmail/create-draft`
- `/api/mcp/granola/search`, `/api/patterns/check`
- `lib/mcp.ts` — shared MCP helper

### Still To Build
- `/api/mcp/slack/post-summary`
- `/api/mcp/notion/get-task` (for 48hr follow-up check)
- Pre-meeting briefing workflow + cron trigger
- History page (`app/history/page.tsx`)
