-- Step 3: reminder emails.
-- The app claims a reminder in the database before sending, so a double click or two
-- open tabs can't send two emails. If the email then fails, it releases the claim.

-- One row per reminder that was claimed. Used for the daily caps. Only the server
-- reads it, so it has no policies.
create table public.reminder_log (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  checklist_id uuid references public.checklists (id) on delete set null,
  sent_at      timestamptz not null default now()
);

create index reminder_log_sent_at_idx on public.reminder_log (sent_at);
create index reminder_log_owner_sent_at_idx on public.reminder_log (owner_id, sent_at);

alter table public.reminder_log enable row level security;
revoke all on public.reminder_log from anon, authenticated;

-- Checks every rule and, if all pass, sets last_reminder_at in the same statement that
-- checks it. Returns jsonb with "result" as one of:
--   ok            claimed. Also returns log_id and previous (the old last_reminder_at)
--   not_found     no such checklist for this accountant
--   closed        the checklist is closed
--   no_email      the checklist has no client email
--   all_received  every item is received, or there are no items
--   too_soon      a reminder went out in the last 24 hours. Also returns next_at
--   account_cap   this accountant has sent p_account_cap in the last 24 hours
--   global_cap    everyone together has sent p_global_cap in the last 24 hours
create function public.claim_reminder(
  p_owner_id     uuid,
  p_checklist_id uuid,
  p_account_cap  integer,
  p_global_cap   integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_checklist public.checklists%rowtype;
  v_previous  timestamptz;
  v_log_id    uuid;
begin
  -- One claim at a time across the whole app, so the caps can't be beaten by
  -- sending in parallel. Reminders are rare, so this costs nothing.
  perform pg_advisory_xact_lock(hashtext('chasely.claim_reminder'));

  select * into v_checklist from public.checklists
  where id = p_checklist_id and owner_id = p_owner_id;

  if not found then return jsonb_build_object('result', 'not_found'); end if;
  if v_checklist.is_closed then return jsonb_build_object('result', 'closed'); end if;
  if v_checklist.client_email is null or btrim(v_checklist.client_email) = '' then
    return jsonb_build_object('result', 'no_email');
  end if;
  if not exists (
    select 1 from public.items where checklist_id = p_checklist_id and received_at is null
  ) then
    return jsonb_build_object('result', 'all_received');
  end if;
  if v_checklist.last_reminder_at is not null
     and v_checklist.last_reminder_at > now() - interval '24 hours' then
    return jsonb_build_object(
      'result', 'too_soon',
      'next_at', v_checklist.last_reminder_at + interval '24 hours'
    );
  end if;
  if (select count(*) from public.reminder_log
      where owner_id = p_owner_id and sent_at > now() - interval '24 hours') >= p_account_cap then
    return jsonb_build_object('result', 'account_cap');
  end if;
  if (select count(*) from public.reminder_log
      where sent_at > now() - interval '24 hours') >= p_global_cap then
    return jsonb_build_object('result', 'global_cap');
  end if;

  -- The claim itself. The where clause repeats the 24-hour check, so even without the
  -- lock above, two claims at once can't both win.
  v_previous := v_checklist.last_reminder_at;
  update public.checklists
  set last_reminder_at = now()
  where id = p_checklist_id
    and (last_reminder_at is null or last_reminder_at <= now() - interval '24 hours');
  if not found then
    return jsonb_build_object('result', 'too_soon', 'next_at', now() + interval '24 hours');
  end if;

  insert into public.reminder_log (owner_id, checklist_id)
  values (p_owner_id, p_checklist_id)
  returning id into v_log_id;

  return jsonb_build_object('result', 'ok', 'log_id', v_log_id, 'previous', v_previous);
end;
$$;

-- Undoes a claim after the email failed: puts last_reminder_at back to what it was
-- and removes the log row, so the failed attempt doesn't count.
create function public.release_reminder(
  p_owner_id     uuid,
  p_checklist_id uuid,
  p_log_id       uuid,
  p_previous     timestamptz
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_claimed_at timestamptz;
begin
  delete from public.reminder_log
  where id = p_log_id and owner_id = p_owner_id and checklist_id = p_checklist_id
  returning sent_at into v_claimed_at;

  if v_claimed_at is null then return; end if;

  -- Only if nothing else has claimed it since.
  update public.checklists
  set last_reminder_at = p_previous
  where id = p_checklist_id and owner_id = p_owner_id and last_reminder_at = v_claimed_at;
end;
$$;

revoke all on function public.claim_reminder(uuid, uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_reminder(uuid, uuid, integer, integer)
  to service_role;

revoke all on function public.release_reminder(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.release_reminder(uuid, uuid, uuid, timestamptz)
  to service_role;
