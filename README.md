# Chasely

Accountants ask Claude for a document checklist. Chasely saves it, gives the client a private link, and tracks progress.
Built so far: step 1 (database, login, `create_checklist`, dashboard, editor).

## Setup

1. Create a Supabase project and run `supabase/migrations/20261105000000_step1_schema.sql` in its SQL Editor.
2. In Supabase, go to Authentication > Sign In / Providers > Email and turn off "Confirm email".
3. Run `cp .env.example .env.local` and fill it in.
4. Run `npm install`, then `npm run dev`.

## Checks

- `npm test` runs validation, MCP and database rule tests. It needs no Supabase project.
- `MCP_URL="..." npm run check:mcp` tries a live MCP URL. It creates one fake checklist called "MCP check".
