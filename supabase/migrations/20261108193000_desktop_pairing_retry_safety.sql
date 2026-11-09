-- S1 retry safety: a successful claim may be repeated with the same
-- one-time code and identical device identity when desktop persistence fails.
-- No new device or audit event is created for an acknowledged retry.
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
