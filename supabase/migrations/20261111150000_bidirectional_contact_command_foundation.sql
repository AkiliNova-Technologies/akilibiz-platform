-- Phase 2A: pilot-only web-originated contact commands.
-- Does not mutate desktop mirrors or desktop SQLite. Acknowledgement follows
-- a separately qualified local transaction. Production flag defaults OFF.
create table private.desktop_inbound_controls (
  business_id uuid primary key references public.businesses(id) on delete restrict,
  contacts_enabled boolean not null default false,
  enabled_at timestamptz,
  enabled_by uuid
);
create table private.desktop_inbound_commands (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  source_business_public_id text not null,
  source_device_public_id uuid not null,
  entity_type text not null check(entity_type in ('customer','supplier')),
  operation text not null check(operation='update'),
  source_public_id uuid not null,
  base_updated_at timestamptz not null,
  base_record jsonb not null check(jsonb_typeof(base_record)='object'),
  changes jsonb not null check(jsonb_typeof(changes)='object'),
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  state text not null default 'pending' check(state in ('pending','applied','conflict')),
  applied_at timestamptz,
  local_receipt_id uuid,
  conflict_reason text,
  check (char_length(source_business_public_id) between 1 and 200),
  check ((state='pending')=(local_receipt_id is null)),
  check (state<>'conflict' or conflict_reason is not null)
);
create unique index desktop_inbound_one_unresolved_contact
  on private.desktop_inbound_commands(business_id,source_business_public_id,entity_type,source_public_id)
  where state='pending';
create index desktop_inbound_device_queue
  on private.desktop_inbound_commands(business_id,source_business_public_id,source_device_public_id,requested_at,id)
  where state='pending';
create table private.desktop_inbound_receipts (
  command_id uuid primary key references private.desktop_inbound_commands(id) on delete restrict,
  business_id uuid not null,
  source_device_public_id uuid not null,
  local_receipt_id uuid not null,
  result text not null check(result in ('applied','conflict')),
  recorded_at timestamptz not null default now()
);
create unique index desktop_inbound_receipt_per_device
  on private.desktop_inbound_receipts(business_id,source_device_public_id,local_receipt_id);
alter table private.desktop_inbound_controls enable row level security;
alter table private.desktop_inbound_controls force row level security;
alter table private.desktop_inbound_commands enable row level security;
alter table private.desktop_inbound_commands force row level security;
alter table private.desktop_inbound_receipts enable row level security;
alter table private.desktop_inbound_receipts force row level security;
revoke all on private.desktop_inbound_controls,private.desktop_inbound_commands,private.desktop_inbound_receipts
  from public,anon,authenticated,service_role;

-- Initial pilot targets existing desktop-origin records only. No new ID
-- allocation, delete, inventory, price, VAT or financial edits.
create function public.request_desktop_contact_update(
  target_business_id uuid,
  target_entity_type text,
  target_record_id uuid,
  expected_updated_at timestamptz,
  requested_changes jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  source_record record;
  paired_device uuid;
  next_id uuid;
  valid_keys text[];
  k text;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  if not exists(select 1 from private.desktop_inbound_controls c
     where c.business_id=target_business_id and c.contacts_enabled) then
    raise exception 'Inbound contact editing is not enabled for this business' using errcode='55000';
  end if;
  if target_entity_type not in ('customer','supplier') or target_record_id is null or
     expected_updated_at is null or requested_changes is null or
     jsonb_typeof(requested_changes)<>'object' or requested_changes='{}'::jsonb then
    raise exception 'Invalid inbound contact request' using errcode='22023';
  end if;
  valid_keys := case target_entity_type
    when 'customer' then array['name','email','phone','address']
    else array['name','contact_person','email','phone','address','payment_terms'] end;
  for k in select jsonb_object_keys(requested_changes) loop
    if not k=any(valid_keys) then
      raise exception 'Unsupported contact field' using errcode='22023';
    end if;
    if jsonb_typeof(requested_changes->k) not in ('string','null') then
      raise exception 'Contact fields must be text or null' using errcode='22023';
    end if;
    if char_length(coalesce(requested_changes->>k,'')) >
      (case k when 'name' then 200 when 'contact_person' then 200
        when 'email' then 320 when 'phone' then 40
        when 'address' then 1000 else 200 end) or
       (k='name' and char_length(btrim(coalesce(requested_changes->>k,'')))=0) then
      raise exception 'Invalid contact field length' using errcode='22023';
    end if;
  end loop;
  -- Serialize competing requests for one record, then verify the source
  -- snapshot's exact version. No blind last-write-wins.
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-inbound:'||target_business_id::text||':'||
    target_entity_type||':'||target_record_id::text,0));
  if target_entity_type='customer' then
    select c.local_business_public_id,c.source_public_id,c.updated_at,
      jsonb_build_object('name',c.name,'email',c.email,'phone',c.phone,'address',c.address) base_record
      into source_record from public.desktop_customers c
    where c.business_id=target_business_id and c.id=target_record_id and c.is_active;
  else
    select s.local_business_public_id,s.source_public_id,s.updated_at,
      jsonb_build_object('name',s.name,'contact_person',s.contact_person,
        'email',s.email,'phone',s.phone,'address',s.address,
        'payment_terms',s.payment_terms) base_record
      into source_record from public.desktop_suppliers s
    where s.business_id=target_business_id and s.id=target_record_id and s.is_active;
  end if;
  if not found then
    raise exception 'Contact is not active in this business' using errcode='23503';
  end if;
  if source_record.updated_at is distinct from expected_updated_at then
    raise exception 'Contact was changed after it was loaded' using errcode='40001';
  end if;
  select d.device_public_id into paired_device from private.desktop_devices d
    where d.business_id=target_business_id
      and d.local_business_public_id=source_record.local_business_public_id
      and d.paired_by=actor and d.revoked_at is null
    order by d.paired_at,d.id limit 1;
  if paired_device is null then
    raise exception 'No authorized desktop source is available' using errcode='42501';
  end if;
  insert into private.desktop_inbound_commands(
    business_id,source_business_public_id,source_device_public_id,
    entity_type,operation,source_public_id,base_updated_at,base_record,changes,requested_by
  ) values (
    target_business_id,source_record.local_business_public_id,paired_device,
    target_entity_type,'update',source_record.source_public_id,
    expected_updated_at,source_record.base_record,requested_changes,actor
  ) returning id into next_id;
  return next_id;
end $$;

create function public.list_pending_desktop_contact_updates(
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
    order by q.requested_at,q.id limit batch_limit;
end $$;

-- Receipt is idempotent and scoped to the exact paired source. The desktop
-- local transaction must be independently validated before calling this RPC.
create function public.ack_desktop_contact_update(
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
  if q.state<>'pending' then
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

-- Owner-visible status is separate from the immutable desktop mirror. A
-- pending command is NOT a completed contact edit.
create function public.desktop_contact_update_status(
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
    select c.id,c.entity_type,c.operation,c.source_public_id,c.state,
           c.requested_at,c.applied_at,c.conflict_reason
    from private.desktop_inbound_commands c
    where c.business_id=target_business_id and c.id=target_command_id
      and c.requested_by=(select auth.uid());
end $contact_status$;
revoke all on function public.desktop_contact_update_status(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.desktop_contact_update_status(uuid,uuid)
  to authenticated;

revoke all on function public.request_desktop_contact_update(uuid,text,uuid,timestamptz,jsonb)
 from public,anon,authenticated,service_role;
revoke all on function public.list_pending_desktop_contact_updates(uuid,text,uuid,integer)
 from public,anon,authenticated,service_role;
revoke all on function public.ack_desktop_contact_update(uuid,text,uuid,uuid,uuid,text)
 from public,anon,authenticated,service_role;
grant execute on function public.request_desktop_contact_update(uuid,text,uuid,timestamptz,jsonb)
 to authenticated;
grant execute on function public.list_pending_desktop_contact_updates(uuid,text,uuid,integer)
 to authenticated;
grant execute on function public.ack_desktop_contact_update(uuid,text,uuid,uuid,uuid,text)
 to authenticated;
