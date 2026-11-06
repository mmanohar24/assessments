# Chasely: build spec (v1)

**One line:** Accountants tell Claude "make a document checklist for this client". Chasely saves it, gives the client a private link to tick items off, tracks progress, and sends reminders until everything is received.

**Rules:** No AI inside the app (no AI keys or AI packages anywhere). Claude does the thinking through MCP. The app saves, edits, serves and reminds. Small and working beats big and half done.

## Stack
- Next.js on Vercel (production URL must be public)
- Supabase for database and login (email confirmation OFF)
- MCP endpoint as a route in the same app
- Email: Gmail SMTP with an app password (nodemailer), keys in env vars only
- Reminders: daily Vercel cron (verify the plan limit) plus a "send reminder now" button

## Users
- **Accountant:** has a login. Uses the web app and Claude.
- **Client:** no login. Opens a private link on their phone.
- **Reviewer:** gets a ready test account with a seeded example and a personal MCP URL.

## Data
- **checklist:** id, owner_id, client_name, client_email (optional), due_date (date only), public_token (long random), is_closed, last_reminder_at, created_at
- **item:** id, checklist_id, title (max 80), note (max 300, why it is needed), position, status, client_note (max 500), sent_at, received_at
- **status:** `pending` -> `sent` (client says they sent it) -> `received` (accountant confirms). The accountant can also mark a `pending` item `received` directly, for example when the client emailed it without ticking.
- **Only the client can set `sent`. Only the accountant can set `received`. Claude can never set either.**
- Client status and accountant status are separate fields so edits never overwrite each other.

## Claude tools (5)
Write the tool descriptions carefully. They are the only "prompt" we control. Every reply includes `edit_url` and `client_url`.
1. `create_checklist` (client_name, client_email?, due_date, items[]). 1 to 40 items.
2. `list_checklists` (newest 20 only)
3. `get_checklist` (id). Client notes come back labeled as untrusted text written by the client.
4. `update_items` (checklist_id, add or edit title and note only). No delete, no status changes.
5. `send_reminder` (one checklist only, to its own email only)

Plain-words errors so Claude can fix and retry: past due date, zero items, too many items, bad date or email format, missing email for a reminder ("reminders need a client email, ask the user for one").

## Screens (4)
1. Login and settings (shows MCP URL once, with a Regenerate button)
2. Dashboard (progress like "4 of 12 received", delete button, empty state)
3. Checklist editor (edit items, mark received, close checklist, send reminder now)
4. Client page (mobile first, tick "I've sent this", optional note, notice: "Don't type account or ID numbers")

Design: one accent color, clean layout, lots of white space.

## Reminders
- Only to the email on that checklist, max one per 24 hours, stop when all items are received or the checklist is closed
- Store `last_reminder_at` so a repeat run can't double send
- Due dates are date only, so time zones never shift them
- Demo safety: an env var `DEMO_EMAIL_OVERRIDE` sends every email to my own address. Say so in the pitch.

## Edge cases (all of them)
**Reviewer can't get in**
- Custom connector may need a paid Claude plan and per-tool approval. Write the connect steps for that, and test in a fresh Claude account.
- Open the app in a private window to confirm it's public (no Vercel preview login wall).
- Supabase email confirmation off, or give a ready test account.
- Free Supabase projects can pause. Open the app right before submitting. Seed one example checklist.

**Claude sends bad input**
- Validate every tool call (past date, no items, 40+ items, odd formats) and return clear errors.
- Double create is possible. Reply says exactly what was created, dashboard has delete.
- Missing client email is allowed, but reminders explain what is needed.
- Keep item titles short. Put the reason in the note.
- Claude cannot mark items received.

**Client page**
- Token is long, random and unguessable. Add `noindex`. No numeric IDs in links.
- Invalid token shows a plain "not found" page. A real but closed checklist shows "This checklist is closed."
- Anyone with the link can tick items. This is a v1 choice and we say so in the pitch.
- Mobile first.

**Reminders**
- See Reminders above. Also: Gmail may block cloud sign-ins or put mail in spam, so test tonight. Check the Vercel cron limit.

**Security**
- Each login sees only its own data. Service keys stay on the server. The public page reads through a server route using the token.
- Client notes are untrusted text. Claude's tools have no delete and no bulk email, and reminders work on one checklist at a time.
- Token in the MCP URL for v1 (store a hash, show once, Regenerate button). State the trade-off in the pitch.
- Basic rate limits on the public page and MCP endpoint.
- Never log tokens. `.env` not committed.
- No file uploads, so no sensitive documents are stored.

**Demo safety**
- Fake but realistic clients only.
- Don't show the MCP URL on screen. Regenerate the token after recording.
- Record the demo as its own take, with a fallback recording.

## Build order (cut from the bottom if short on time)
1. Database, login, create tool, dashboard and editor
2. Client page with statuses
3. Send reminder button and email
4. Remaining Claude tools
5. Daily cron
6. Polish, seed data, pricing line

## Before submitting
- Search the repo for AI keys or AI packages (openai, anthropic, etc.). The MCP SDK is fine.
- Test the whole flow in a fresh Claude account using only the written connect steps.
- Public URL works in a private window. Test login works. Example data is there.
- Gmail reminder arrives (check spam).

## Demo prompt
"Make a tax filing document checklist for Ravi, a freelance designer in India with rental income, due Dec 15."
Then: see it appear, edit one item, open the client link on a phone, tick two items (shows "2 sent"), mark one received (shows "1 of 12 received"), send a reminder.

## Pitch notes (numbers to decide tomorrow)
- Price: about $15 to $30 per month per practice (a guess, not validated)
- Cost per customer: hosting plus email, near zero (work out the real number)
- First 100 customers: LinkedIn outreach, accountant groups, free pilot with about 10 firms
- Honest risks: buyers must already use Claude or ChatGPT, token-in-URL security for v1, sender is a Gmail address for now
- Optional proof: one real reply from an accountant
