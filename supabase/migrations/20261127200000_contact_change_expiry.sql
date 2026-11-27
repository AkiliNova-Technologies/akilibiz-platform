-- Expiry and recovery for web contact edits the desktop never picks up.
--
-- A web edit waited for the desktop forever: an offline, uninstalled or unpaired
-- desktop left it pending indefinitely, and because only one pending edit is
-- allowed per contact, it also blocked every later edit to that contact.
--
--   * A pending edit older than seven days is EXPIRED (derived, owner-visible):
--     the desktop stops receiving it, and a new edit to the same contact
--     supersedes it automatically.
--   * The owner can WITHDRAW a waiting edit, or RESEND an expired or withdrawn
--     one against the contact's current synchronized version.
--   * If the desktop had already received the edit, its result is still
--     accepted. The desktop is authoritative; a late result must never leave a
--     desktop receipt unacknowledged forever.

create function private.desktop_contact_change_ttl()
returns interval language sql immutable set search_path='' as $$ select interval '7 days' $$;
revoke all on function private.desktop_contact_change_ttl() from public,anon,authenticated,service_role;

create function private.desktop_contact_change_state(state text, requested_at timestamptz)
returns text language sql stable set search_path='' as $$
  select case when state='pending' and requested_at <= now() - private.desktop_contact_change_ttl()
    then 'expired' else state end
$$;
revoke all on function private.desktop_contact_change_state(text,timestamptz)
  from public,anon,authenticated,service_role;

alter table private.desktop_inbound_commands
  add column withdrawn_at timestamptz,
  add column withdrawn_reason text
    check (withdrawn_reason in ('owner','expired_resent','expired_superseded','already_current')),
  add column resent_command_id uuid references private.desktop_inbound_commands(id);
alter table private.desktop_inbound_commands
  drop constraint desktop_inbound_commands_state_check,
  drop constraint desktop_inbound_commands_check;
alter table private.desktop_inbound_commands
  add constraint desktop_inbound_commands_state_check
    check (state in ('pending','applied','conflict','withdrawn')),
  add constraint desktop_inbound_commands_receipt_check
    check ((state in ('pending','withdrawn')) = (local_receipt_id is null)),
  add constraint desktop_inbound_withdrawal_consistency
    check ((withdrawn_at is null) = (withdrawn_reason is null)
      and (state <> 'withdrawn' or withdrawn_at is not null));

-- Desktop delivery skips withdrawn and expired edits.
create or replace function public.list_pending_desktop_contact_updates(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  batch_limit integer default 50
) returns table(
  command_id uuid,entity_type text,operation text,source_public_id uuid,
  base_updated_at timestamptz,base_record jsonb,changes jsonb,requested_at timestamptz
) language plpgsql security definer set search_path='' as $$
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  if batch_limit is null or batch_limit<1 or batch_limit>100 then
    raise exception 'Invalid inbound batch size' using errcode='22023';
  end if;
  if not exists(select 1 from private.desktop_inbound_controls c
      where c.business_id=target_business_id and c.contacts_enabled) then
    return;
  end if;
  return query
    select q.id,q.entity_type,q.operation,q.source_public_id,
           q.base_updated_at,q.base_record,q.changes,q.requested_at
    from private.desktop_inbound_commands q
    where q.business_id=target_business_id
      and q.source_business_public_id=list_pending_desktop_contact_updates.source_business_public_id
      and q.source_device_public_id=list_pending_desktop_contact_updates.source_device_public_id
      and q.state='pending'
      and q.requested_at > now() - private.desktop_contact_change_ttl()
    order by q.requested_at,q.id limit batch_limit;
end $$;

-- A late result for an expired or withdrawn edit the desktop already received
-- is accepted and recorded; the withdrawal stays visible for audit.
create or replace function public.ack_desktop_contact_update(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  target_command_id uuid,
  receipt_id uuid,
  outcome text
) returns text language plpgsql security definer set search_path='' as $$
declare q private.desktop_inbound_commands%rowtype;
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  if receipt_id is null or target_command_id is null or
      outcome not in ('applied','conflict') then
    raise exception 'Invalid contact acknowledgement' using errcode='22023';
  end if;
  select * into q from private.desktop_inbound_commands c
    where c.id=target_command_id and c.business_id=target_business_id
      and c.source_business_public_id=ack_desktop_contact_update.source_business_public_id
      and c.source_device_public_id=ack_desktop_contact_update.source_device_public_id
    for update;
  if not found then
    raise exception 'Contact command does not belong to this desktop source' using errcode='42501';
  end if;
  if q.state not in ('pending','withdrawn') then
    if q.state=outcome and q.local_receipt_id=receipt_id then return q.state; end if;
    raise exception 'Conflicting contact acknowledgement' using errcode='23505';
  end if;
  insert into private.desktop_inbound_receipts(
    command_id,business_id,source_device_public_id,local_receipt_id,result
  ) values(target_command_id,target_business_id,source_device_public_id,receipt_id,outcome);
  update private.desktop_inbound_commands c
    set state=outcome,applied_at=case when outcome='applied' then now() else null end,
      local_receipt_id=receipt_id,
      conflict_reason=case when outcome='conflict' then 'Local record version changed'
        else null end
    where c.id=target_command_id;
  return outcome;
end $$;

-- Owner status reports the effective state (expired is derived).
create or replace function public.desktop_contact_update_status(
  target_business_id uuid, target_command_id uuid
) returns table(
  command_id uuid,entity_type text,operation text,source_public_id uuid,
  state text,requested_at timestamptz,applied_at timestamptz,
  conflict_reason text
) language plpgsql security definer set search_path='' as $contact_status$
begin
  if not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  return query
    select c.id,c.entity_type,c.operation,c.source_public_id,
           private.desktop_contact_change_state(c.state,c.requested_at),
           c.requested_at,c.applied_at,c.conflict_reason
    from private.desktop_inbound_commands c
    where c.business_id=target_business_id and c.id=target_command_id
      and c.requested_by=(select auth.uid());
end $contact_status$;

-- The owner list gains expiry, withdrawal and resend details.
drop function public.list_desktop_contact_change_requests(uuid);
create function public.list_desktop_contact_change_requests(target_business_id uuid)
returns table(
  command_id uuid, entity_type text, contact_id uuid, contact_name text, state text,
  requested_at timestamptz, applied_at timestamptz, conflict_reason text,
  requested_changes jsonb, base_record jsonb, current_record jsonb,
  resolution text, resolved_at timestamptz, replacement_command_id uuid,
  expires_at timestamptz, withdrawn_at timestamptz, withdrawn_reason text,
  resent_command_id uuid
) language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  return query
    select c.id, c.entity_type, cur.contact_id,
      coalesce(cur.contact_name, c.base_record->>'name'),
      private.desktop_contact_change_state(c.state, c.requested_at),
      c.requested_at, c.applied_at, c.conflict_reason, c.changes, c.base_record,
      cur.record, c.resolution, c.resolved_at, c.replacement_command_id,
      c.requested_at + private.desktop_contact_change_ttl(),
      c.withdrawn_at, c.withdrawn_reason, c.resent_command_id
    from private.desktop_inbound_commands c
    left join lateral private.current_desktop_contact(
      c.business_id, c.source_business_public_id, c.entity_type, c.source_public_id) cur on true
    where c.business_id=target_business_id and c.requested_by=(select auth.uid())
    order by c.requested_at desc, c.id desc
    limit 100;
end $$;
revoke all on function public.list_desktop_contact_change_requests(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.list_desktop_contact_change_requests(uuid) to authenticated;

-- Withdraw a waiting (or expired) edit. Idempotent.
create function public.withdraw_desktop_contact_change(target_business_id uuid, target_command_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); c private.desktop_inbound_commands%rowtype;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  select * into c from private.desktop_inbound_commands x
   where x.id=target_command_id and x.business_id=target_business_id and x.requested_by=actor
   for update;
  if not found then
    raise exception 'Contact change request not found' using errcode='42501';
  end if;
  if c.state='withdrawn' then return 'withdrawn'; end if;
  if c.state<>'pending' then
    raise exception 'Only a change still waiting for the desktop can be withdrawn' using errcode='55000';
  end if;
  update private.desktop_inbound_commands
     set state='withdrawn', withdrawn_at=now(), withdrawn_reason='owner'
   where id=c.id;
  return 'withdrawn';
end $$;
revoke all on function public.withdraw_desktop_contact_change(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.withdraw_desktop_contact_change(uuid,uuid) to authenticated;

-- Resend an expired or withdrawn edit against the current synchronized version.
-- Sends only fields that still differ; returns the new request ID, or null when
-- the desktop already has the owner's values. Idempotent once resent.
create function public.resend_desktop_contact_change(target_business_id uuid, target_command_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  c private.desktop_inbound_commands%rowtype;
  cur record;
  remaining jsonb := '{}'::jsonb;
  k text;
  new_id uuid;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  select * into c from private.desktop_inbound_commands x
   where x.id=target_command_id and x.business_id=target_business_id and x.requested_by=actor
   for update;
  if not found then
    raise exception 'Contact change request not found' using errcode='42501';
  end if;
  if c.resent_command_id is not null then return c.resent_command_id; end if;
  if c.withdrawn_reason='already_current' then return null; end if;
  if not (c.state='withdrawn'
      or private.desktop_contact_change_state(c.state, c.requested_at)='expired') then
    raise exception 'Only an expired or withdrawn change can be resent' using errcode='55000';
  end if;
  select * into cur from private.current_desktop_contact(
    c.business_id, c.source_business_public_id, c.entity_type, c.source_public_id);
  if not found then
    raise exception 'Contact is not active in this business' using errcode='23503';
  end if;
  for k in select jsonb_object_keys(c.changes) loop
    if (c.changes->k) is distinct from (cur.record->k) then
      remaining := remaining || jsonb_build_object(k, c.changes->k);
    end if;
  end loop;
  if c.state='pending' then
    update private.desktop_inbound_commands
       set state='withdrawn', withdrawn_at=now(),
           withdrawn_reason=case when remaining='{}'::jsonb then 'already_current' else 'expired_resent' end
     where id=c.id;
  end if;
  if remaining='{}'::jsonb then
    return null;
  end if;
  new_id := public.request_desktop_contact_update(
    target_business_id, c.entity_type, cur.contact_id, cur.updated_at, remaining);
  update private.desktop_inbound_commands set resent_command_id=new_id where id=c.id;
  return new_id;
end $$;
revoke all on function public.resend_desktop_contact_change(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.resend_desktop_contact_change(uuid,uuid) to authenticated;

-- A new edit supersedes an expired one for the same contact, so an
-- unreachable desktop can no longer block a contact's edits forever.
do $migration$
declare
  definition text;
  marker text := $marker$    raise exception 'Contact was changed after it was loaded' using errcode='PT409';
  end if;
$marker$;
begin
  select pg_get_functiondef(
    'public.request_desktop_contact_update(uuid,text,uuid,timestamptz,jsonb)'::regprocedure
  ) into definition;
  if position(marker in definition) = 0 then
    raise exception 'Reviewed request_desktop_contact_update definition was not found';
  end if;
  definition := replace(definition, marker, marker || $supersede$  update private.desktop_inbound_commands q
     set state='withdrawn', withdrawn_at=now(), withdrawn_reason='expired_superseded'
   where q.business_id=target_business_id
     and q.source_business_public_id=source_record.local_business_public_id
     and q.entity_type=target_entity_type
     and q.source_public_id=source_record.source_public_id
     and q.state='pending'
     and q.requested_at <= now() - private.desktop_contact_change_ttl();
$supersede$);
  execute definition;
end
$migration$;
