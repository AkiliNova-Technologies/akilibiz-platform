-- Durable, ordered catalogue event acknowledgement.
-- Only an authenticated owner of the linked desktop device may apply updates.
-- Each event ID is recorded in the same transaction as its mutation.
create table private.desktop_catalogue_event_receipts (
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_business_public_id text not null,
  event_id text not null check (event_id ~ '^[0-9a-f]{32}$'),
  entity_type text not null check (entity_type in ('category','product')),
  source_record_id bigint not null check(source_record_id > 0),
  operation text not null check(operation in ('upsert','deactivate')),
  received_at timestamptz not null default now(),
  primary key(business_id,source_business_public_id,event_id)
);
revoke all on private.desktop_catalogue_event_receipts from public,anon,authenticated,service_role;

create or replace function public.apply_desktop_catalogue_event(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  event_id text,
  entity_type text,
  source_record_id bigint,
  operation text,
  record jsonb default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  accepted boolean;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner permission required' using errcode='42501';
  end if;
  if not exists (
    select 1 from private.desktop_devices d
    where d.business_id=target_business_id and d.device_public_id=source_device_public_id
      and d.local_business_public_id=source_business_public_id
      and d.paired_by=actor and d.revoked_at is null
  ) then
    raise exception 'Desktop device is not authorized' using errcode='42501';
  end if;
  if event_id is null or event_id !~ '^[0-9a-f]{32}$'
     or entity_type not in ('category','product')
     or operation not in ('upsert','deactivate')
     or source_record_id is null or source_record_id < 1 then
    raise exception 'Invalid catalogue event' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-catalogue:' || target_business_id::text || ':' || source_business_public_id,0
  ));
  if exists (
    select 1 from private.desktop_catalogue_event_receipts r
    where r.business_id=target_business_id
      and r.source_business_public_id=apply_desktop_catalogue_event.source_business_public_id
      and r.event_id=apply_desktop_catalogue_event.event_id
  ) then
    return true;
  end if;
  if operation='upsert' then
    if jsonb_typeof(record) <> 'object' or record->>'id' <> source_record_id::text then
      raise exception 'Event source ID does not match its record' using errcode='22023';
    end if;
    if entity_type='category' then
      perform public.upload_desktop_catalogue(target_business_id,source_business_public_id,
        source_device_public_id,jsonb_build_array(record),'[]'::jsonb);
    else
      perform public.upload_desktop_catalogue(target_business_id,source_business_public_id,
        source_device_public_id,'[]'::jsonb,jsonb_build_array(record));
    end if;
  else
    if entity_type='category' then
      update public.desktop_categories dc set is_active=false,updated_at=now()
      where dc.business_id=target_business_id and dc.local_business_public_id=source_business_public_id
        and dc.local_category_id=source_record_id;
    else
      update public.desktop_products dp set is_active=false,updated_at=now()
      where dp.business_id=target_business_id and dp.local_business_public_id=source_business_public_id
        and dp.local_product_id=source_record_id;
    end if;
  end if;
  insert into private.desktop_catalogue_event_receipts(
    business_id,source_business_public_id,event_id,entity_type,source_record_id,operation
  ) values(target_business_id,source_business_public_id,event_id,entity_type,source_record_id,operation);
  return true;
end;
$$;
revoke all on function public.apply_desktop_catalogue_event(uuid,text,uuid,text,text,bigint,text,jsonb)
 from public,anon,service_role;
grant execute on function public.apply_desktop_catalogue_event(uuid,text,uuid,text,text,bigint,text,jsonb)
 to authenticated;
