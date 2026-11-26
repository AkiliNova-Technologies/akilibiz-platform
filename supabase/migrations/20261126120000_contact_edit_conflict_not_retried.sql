-- request_desktop_contact_update reported a stale contact version with
-- SQLSTATE 40001 (serialization_failure). PostgREST automatically retries
-- 40001 transactions, so a stale web edit re-ran the same failing check until
-- the API gateway timed out (~2 minutes) instead of reporting a conflict.
-- PT409 makes PostgREST return HTTP 409 immediately and is never retried.
-- The function is otherwise unchanged; CREATE OR REPLACE keeps its grants.
create or replace function public.request_desktop_contact_update(
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
    raise exception 'Contact was changed after it was loaded' using errcode='PT409';
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
