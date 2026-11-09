-- Forward-only corrections for functions whose historical migrations are
-- already recorded by the hosted project. Keep the historical files exact.

create or replace function public.claim_desktop_pairing(
  pairing_code text,
  local_business_public_id text,
  device_public_id uuid
)
returns table(hosted_business_id uuid, hosted_device_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  challenge private.desktop_pairing_challenges%rowtype;
  device_uuid uuid;
begin
  if actor is null or length(pairing_code) <> 64
    or pairing_code !~ '^[0-9a-f]{64}$'
    or length(btrim(local_business_public_id)) not between 16 and 128
    or device_public_id is null then
    raise exception 'Invalid or expired pairing request' using errcode = '22023';
  end if;

  select * into challenge from private.desktop_pairing_challenges c
  where c.secret_hash = sha256(convert_to(pairing_code,'UTF8'))
    and c.created_by = actor
  for update;
  if not found or not private.is_active_business_owner(challenge.business_id) then
    raise exception 'Invalid or expired pairing request' using errcode = '42501';
  end if;

  if challenge.consumed_at is not null then
    select d.id into device_uuid from private.desktop_devices d
    where d.business_id = challenge.business_id
      and d.device_public_id = claim_desktop_pairing.device_public_id
      and d.local_business_public_id = btrim(claim_desktop_pairing.local_business_public_id)
      and d.paired_by = actor and d.revoked_at is null
      and d.paired_at >= challenge.created_at
      and d.paired_at <= challenge.expires_at;
    if device_uuid is null then
      raise exception 'Pairing code already used' using errcode = '42501';
    end if;
    return query select challenge.business_id, device_uuid;
    return;
  end if;

  if challenge.expires_at <= now() then
    raise exception 'Pairing code expired' using errcode = '42501';
  end if;

  if exists (
    select 1 from private.desktop_devices d
    where d.local_business_public_id = btrim(claim_desktop_pairing.local_business_public_id)
      and d.revoked_at is null and d.business_id <> challenge.business_id
  ) then
    raise exception 'Local business is already linked to another hosted business' using errcode = '23505';
  end if;

  insert into private.desktop_devices(
    business_id,local_business_public_id,device_public_id,paired_by
  ) values(challenge.business_id,btrim(local_business_public_id),device_public_id,actor)
  on conflict on constraint desktop_devices_device_public_id_key do nothing
  returning id into device_uuid;

  if device_uuid is null then
    select d.id into device_uuid from private.desktop_devices d
    where d.device_public_id = claim_desktop_pairing.device_public_id
      and d.business_id = challenge.business_id
      and d.local_business_public_id = btrim(claim_desktop_pairing.local_business_public_id)
      and d.revoked_at is null;
    if device_uuid is null then
      raise exception 'Device already paired elsewhere or revoked' using errcode = '23505';
    end if;
  end if;

  update private.desktop_pairing_challenges set consumed_at = now() where id = challenge.id;
  insert into public.audit_events(business_id,actor_id,event_type,entity_type,entity_id,payload)
  values(challenge.business_id,actor,'desktop.paired','desktop_device',device_uuid,
         jsonb_build_object('device_id',device_uuid));
  return query select challenge.business_id,device_uuid;
end;
$$;
revoke all on function public.claim_desktop_pairing(text,text,uuid) from public, anon, service_role;
grant execute on function public.claim_desktop_pairing(text,text,uuid) to authenticated;

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
