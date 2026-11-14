-- Phase 2B foundation: separate, default-off create commands.
-- Update command tables/checks from Phase 2A remain unchanged.
alter table private.desktop_inbound_controls
  add column contact_creates_enabled boolean not null default false;

create table private.desktop_contact_create_commands (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  business_id uuid not null references public.businesses(id) on delete restrict,
  source_business_public_id text not null,
  source_device_public_id uuid not null,
  source_public_id uuid not null default gen_random_uuid(),
  entity_type text not null check(entity_type in ('customer','supplier')),
  fields jsonb not null check(jsonb_typeof(fields)='object'),
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  state text not null default 'pending' check(state in ('pending','applied','conflict')),
  applied_at timestamptz,
  local_receipt_id uuid,
  conflict_reason text,
  unique(business_id,requested_by,request_id),
  unique(business_id,source_business_public_id,entity_type,source_public_id),
  check((state='pending')=(local_receipt_id is null)),
  check(state <> 'conflict' or conflict_reason is not null)
);
create index desktop_contact_creates_source_queue
  on private.desktop_contact_create_commands
  (business_id,source_business_public_id,source_device_public_id,requested_at,id)
  where state='pending';
alter table private.desktop_contact_create_commands enable row level security;
alter table private.desktop_contact_create_commands force row level security;
revoke all on private.desktop_contact_create_commands
  from public,anon,authenticated,service_role;

create function public.request_desktop_contact_create(
  target_business_id uuid,
  target_entity_type text,
  request_id uuid,
  contact_fields jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  source_device uuid;
  source_business text;
  command_id uuid;
  previous private.desktop_contact_create_commands%rowtype;
  allowed text[];
  required text[];
  field text;
  value text;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  if not exists(
    select 1 from private.desktop_inbound_controls c
    where c.business_id=target_business_id and c.contact_creates_enabled
  ) then
    raise exception 'Contact creation is not enabled for this business' using errcode='55000';
  end if;
  if request_id is null or target_entity_type not in ('customer','supplier')
    or jsonb_typeof(contact_fields) is distinct from 'object'
    or contact_fields='{}'::jsonb then
    raise exception 'Invalid contact creation request' using errcode='22023';
  end if;
  allowed := case target_entity_type
    when 'customer' then array['name','email','phone','address']
    else array['name','contact_person','phone','email','address','payment_terms'] end;
  required := case target_entity_type
    when 'customer' then array['name']
    else array['name','contact_person','phone','payment_terms'] end;
  if exists(select 1 from unnest(required) k where
    not contact_fields ? k or
    jsonb_typeof(contact_fields->k)<>'string' or
    btrim(contact_fields->>k)='') then
    raise exception 'Required contact fields are missing' using errcode='22023';
  end if;
  for field in select jsonb_object_keys(contact_fields) loop
    if not field=any(allowed) or jsonb_typeof(contact_fields->field)
      not in ('string','null') then
      raise exception 'Unsupported contact field' using errcode='22023';
    end if;
    value := contact_fields->>field;
    if char_length(coalesce(value,'')) >
      (case field when 'name' then 200 when 'contact_person' then 200
        when 'email' then 320 when 'phone' then 40
        when 'address' then 1000 else 200 end) then
      raise exception 'Contact field too long' using errcode='22023';
    end if;
  end loop;
  -- Request ID is scoped to the authenticated owner and business.
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-create:'||target_business_id::text||':'||actor::text||':'||request_id::text,0));
  select * into previous from private.desktop_contact_create_commands c
  where c.business_id=target_business_id and c.requested_by=actor
    and c.request_id=request_desktop_contact_create.request_id;
  if found then
    if previous.entity_type<>target_entity_type or previous.fields<>contact_fields then
      raise exception 'Request ID reused with different contents' using errcode='23505';
    end if;
    return previous.id;
  end if;
  select d.device_public_id,d.local_business_public_id
    into source_device,source_business
    from private.desktop_devices d
    where d.business_id=target_business_id and d.paired_by=actor and d.revoked_at is null
    order by d.paired_at,d.id limit 1;
  if source_device is null or source_business is null then
    raise exception 'No authorized desktop source available' using errcode='42501';
  end if;
  insert into private.desktop_contact_create_commands(
    business_id,request_id,source_business_public_id,source_device_public_id,
    entity_type,fields,requested_by
  ) values(target_business_id,request_id,source_business,source_device,
           target_entity_type,contact_fields,actor)
    returning id into command_id;
  return command_id;
end $$;

create function public.list_pending_desktop_contact_creates(
  target_business_id uuid, source_business_public_id text,
  source_device_public_id uuid, batch_limit integer default 25
) returns table(
  command_id uuid,entity_type text,source_public_id uuid,fields jsonb,requested_at timestamptz
) language plpgsql security definer set search_path='' as $$
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  if batch_limit is null or batch_limit<1 or batch_limit>50 then
    raise exception 'Invalid contact creation batch size' using errcode='22023';
  end if;
  if not exists(select 1 from private.desktop_inbound_controls c
    where c.business_id=target_business_id and c.contact_creates_enabled) then
    return;
  end if;
  return query select c.id,c.entity_type,c.source_public_id,c.fields,c.requested_at
    from private.desktop_contact_create_commands c
    where c.business_id=target_business_id
      and c.source_business_public_id=list_pending_desktop_contact_creates.source_business_public_id
      and c.source_device_public_id=list_pending_desktop_contact_creates.source_device_public_id
      and c.state='pending'
    order by c.requested_at,c.id limit batch_limit;
end $$;

create function public.ack_desktop_contact_create(
  target_business_id uuid,source_business_public_id text,
  source_device_public_id uuid,target_command_id uuid,
  receipt_id uuid,outcome text
) returns text language plpgsql security definer set search_path='' as $$
declare cmd private.desktop_contact_create_commands%rowtype;
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  if target_command_id is null or receipt_id is null
    or outcome not in ('applied','conflict') then
    raise exception 'Invalid creation acknowledgement' using errcode='22023';
  end if;
  select * into cmd from private.desktop_contact_create_commands c
   where c.id=target_command_id and c.business_id=target_business_id
     and c.source_business_public_id=ack_desktop_contact_create.source_business_public_id
     and c.source_device_public_id=ack_desktop_contact_create.source_device_public_id
   for update;
  if not found then
    raise exception 'Unknown contact creation for this desktop' using errcode='42501';
  end if;
  if cmd.state<>'pending' then
    if cmd.state=outcome and cmd.local_receipt_id=receipt_id then return cmd.state; end if;
    raise exception 'Conflicting acknowledgement' using errcode='23505';
  end if;
  update private.desktop_contact_create_commands c
    set state=outcome,local_receipt_id=receipt_id,
      applied_at=case when outcome='applied' then now() else null end,
      conflict_reason=case when outcome='conflict' then 'Desktop rejected this creation' else null end
    where c.id=target_command_id;
  return outcome;
end $$;

create function public.desktop_contact_create_status(
  target_business_id uuid,target_command_id uuid
) returns table(
  command_id uuid,source_public_id uuid,state text,
  requested_at timestamptz,applied_at timestamptz,conflict_reason text
) language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  return query select c.id,c.source_public_id,c.state,c.requested_at,
      c.applied_at,c.conflict_reason
    from private.desktop_contact_create_commands c
    where c.business_id=target_business_id and c.id=target_command_id
      and c.requested_by=(select auth.uid());
end $$;

revoke all on function public.request_desktop_contact_create(uuid,text,uuid,jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.list_pending_desktop_contact_creates(uuid,text,uuid,integer)
  from public,anon,authenticated,service_role;
revoke all on function public.ack_desktop_contact_create(uuid,text,uuid,uuid,uuid,text)
  from public,anon,authenticated,service_role;
revoke all on function public.desktop_contact_create_status(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.request_desktop_contact_create(uuid,text,uuid,jsonb)
  to authenticated;
grant execute on function public.list_pending_desktop_contact_creates(uuid,text,uuid,integer)
  to authenticated;
grant execute on function public.ack_desktop_contact_create(uuid,text,uuid,uuid,uuid,text)
  to authenticated;
grant execute on function public.desktop_contact_create_status(uuid,uuid)
  to authenticated;
