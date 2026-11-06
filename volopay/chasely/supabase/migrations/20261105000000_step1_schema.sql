-- Chasely, build step 1.
-- Status rule from the spec, enforced here and not only in app code:
--   pending -> sent (client) -> received (accountant). The accountant can also
--   go straight from pending to received, if the client never ticked the item.
--   Only the client can set sent. Only the accountant can set received.
--   Claude can never set either.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.checklists (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  client_name      text not null check (char_length(client_name) between 1 and 120),
  client_email     text check (client_email is null or char_length(client_email) <= 254),
  due_date         date not null,
  public_token     text not null unique check (char_length(public_token) >= 32),
  is_closed        boolean not null default false,
  last_reminder_at timestamptz,
  created_at       timestamptz not null default now()
);

create index checklists_owner_created_idx
  on public.checklists (owner_id, created_at desc);

create table public.items (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 80),
  note         text not null default '' check (char_length(note) <= 300),
  position     integer not null,
  client_note  text check (client_note is null or char_length(client_note) <= 500),
  sent_at      timestamptz, -- the client's field
  received_at  timestamptz, -- the accountant's field
  -- Worked out from the two fields above, so nobody can write it directly and
  -- a client edit can never overwrite an accountant edit, or the other way round.
  status       text generated always as (
    case
      when received_at is not null then 'received'
      when sent_at is not null then 'sent'
      else 'pending'
    end
  ) stored
);

create index items_checklist_position_idx
  on public.items (checklist_id, position);

-- One MCP token per accountant. Only the hash is stored. The raw token is shown once.
create table public.mcp_tokens (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

-- Fixed window counters. Keys are hashed before they get here, never raw tokens or IPs.
create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 1,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------------
-- Row level security: each login sees only its own data
-- ---------------------------------------------------------------------------

alter table public.checklists  enable row level security;
alter table public.items       enable row level security;
alter table public.mcp_tokens  enable row level security;
alter table public.rate_limits enable row level security;

create policy "own checklists: read" on public.checklists
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "own checklists: update" on public.checklists
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "own checklists: delete" on public.checklists
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "own items: read" on public.items
  for select to authenticated
  using (exists (
    select 1 from public.checklists c
    where c.id = checklist_id and c.owner_id = (select auth.uid())
  ));

create policy "own items: insert" on public.items
  for insert to authenticated
  with check (exists (
    select 1 from public.checklists c
    where c.id = checklist_id and c.owner_id = (select auth.uid())
  ));

create policy "own items: update" on public.items
  for update to authenticated
  using (exists (
    select 1 from public.checklists c
    where c.id = checklist_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.checklists c
    where c.id = checklist_id and c.owner_id = (select auth.uid())
  ));

create policy "own items: delete" on public.items
  for delete to authenticated
  using (exists (
    select 1 from public.checklists c
    where c.id = checklist_id and c.owner_id = (select auth.uid())
  ));

create policy "own token: read" on public.mcp_tokens
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- rate_limits has no policies on purpose: only the server can touch it.

-- ---------------------------------------------------------------------------
-- Column permissions: Supabase grants everything by default, so take it back
-- and hand out only what each role needs.
-- ---------------------------------------------------------------------------

revoke all on public.checklists, public.items, public.mcp_tokens, public.rate_limits
  from anon, authenticated;

-- Accountant, through the web app. public_token, owner_id and last_reminder_at
-- are not writable. New checklists come only through the create function below.
grant select, delete on public.checklists to authenticated;
grant update (client_name, client_email, due_date, is_closed)
  on public.checklists to authenticated;

-- Accountant can set received_at but has no permission on sent_at or client_note.
grant select, delete on public.items to authenticated;
grant insert (checklist_id, title, note, position) on public.items to authenticated;
grant update (title, note, position, received_at) on public.items to authenticated;

-- Settings shows when the token was made, never the hash.
grant select (user_id, created_at) on public.mcp_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- create_checklist tool: all or nothing, and only title and note can get in
-- ---------------------------------------------------------------------------

create function public.create_checklist_with_items(
  p_owner_id     uuid,
  p_client_name  text,
  p_client_email text,
  p_due_date     date,
  p_public_token text,
  p_items        jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.checklists (owner_id, client_name, client_email, due_date, public_token)
  values (p_owner_id, p_client_name, p_client_email, p_due_date, p_public_token)
  returning id into v_id;

  insert into public.items (checklist_id, title, note, position)
  select v_id, elem ->> 'title', coalesce(elem ->> 'note', ''), ord::integer
  from jsonb_array_elements(p_items) with ordinality as t (elem, ord);

  return v_id;
end;
$$;

revoke all on function public.create_checklist_with_items(uuid, text, text, date, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_checklist_with_items(uuid, text, text, date, text, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Basic rate limit. Returns true if this hit is allowed.
-- ---------------------------------------------------------------------------

create function public.hit_rate_limit(
  p_key            text,
  p_max            integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start)
  values (p_key, v_window)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  -- Now and then, clear out old counters so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 hour';
  end if;

  return v_hits <= p_max;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer)
  to service_role;
