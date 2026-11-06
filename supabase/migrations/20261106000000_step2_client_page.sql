-- Step 2: the client page at /c/<token>.
-- The client has no login. The app checks the token on the server and calls these
-- functions with the service key. They only ever touch sent_at and client_note, so the
-- client can never set received. Nothing changes once an item is received or the
-- checklist is closed.
--
-- Each returns a plain result code:
--   'pending' or 'sent'  saved, and this is the item's status now
--   'received'           the accountant already received it, so nothing changed
--   'closed'             the checklist is closed, so nothing changed
--   'not_found'          no such checklist, or the item isn't on it

create function public.client_set_sent(
  p_token   text,
  p_item_id uuid,
  p_sent    boolean
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_checklist uuid;
  v_closed    boolean;
  v_status    text;
begin
  select id, is_closed into v_checklist, v_closed
  from public.checklists where public_token = p_token;

  if v_checklist is null then return 'not_found'; end if;
  if v_closed then return 'closed'; end if;

  update public.items
  set sent_at = case when p_sent then coalesce(sent_at, now()) else null end
  where id = p_item_id and checklist_id = v_checklist and received_at is null
  returning status into v_status;

  if v_status is not null then return v_status; end if;

  if exists (select 1 from public.items where id = p_item_id and checklist_id = v_checklist) then
    return 'received';
  end if;
  return 'not_found';
end;
$$;

-- A blank note clears it. Longer than 500 characters fails on the column check.
create function public.client_set_note(
  p_token   text,
  p_item_id uuid,
  p_note    text
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_checklist uuid;
  v_closed    boolean;
  v_status    text;
begin
  select id, is_closed into v_checklist, v_closed
  from public.checklists where public_token = p_token;

  if v_checklist is null then return 'not_found'; end if;
  if v_closed then return 'closed'; end if;

  update public.items
  set client_note = nullif(btrim(p_note), '')
  where id = p_item_id and checklist_id = v_checklist and received_at is null
  returning status into v_status;

  if v_status is not null then return v_status; end if;

  if exists (select 1 from public.items where id = p_item_id and checklist_id = v_checklist) then
    return 'received';
  end if;
  return 'not_found';
end;
$$;

revoke all on function public.client_set_sent(text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.client_set_sent(text, uuid, boolean)
  to service_role;

revoke all on function public.client_set_note(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.client_set_note(text, uuid, text)
  to service_role;
