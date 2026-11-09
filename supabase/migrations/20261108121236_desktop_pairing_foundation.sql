-- S1: authenticated, owner-scoped, single-use desktop pairing.
-- Existing data is unchanged; no device can upload catalogue data yet.
create table private.desktop_pairing_challenges (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  secret_hash bytea not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index desktop_pairing_challenges_business_idx
  on private.desktop_pairing_challenges(business_id, created_at desc);

create table private.desktop_devices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  local_business_public_id text not null,
  device_public_id uuid not null unique,
  paired_by uuid not null references auth.users(id) on delete restrict,
  paired_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (business_id, local_business_public_id, device_public_id),
  constraint desktop_devices_local_id_valid
    check (char_length(btrim(local_business_public_id)) between 16 and 128)
);
create index desktop_devices_business_idx on private.desktop_devices(business_id);

revoke all on private.desktop_pairing_challenges, private.desktop_devices
  from public, anon, authenticated, service_role;

-- A code is a 256-bit random capability, not a short human PIN.
-- Only the authenticated business owner can issue it.
create function public.create_desktop_pairing(target_business_id uuid)
returns table(pairing_code text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  code text;
  deadline timestamptz := now() + interval '10 minutes';
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Not authorized to pair this business' using errcode = '42501';
  end if;
  code := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  -- Invalidate outstanding codes from this owner for this business.
  delete from private.desktop_pairing_challenges
  where business_id = target_business_id and created_by = actor and consumed_at is null;
  insert into private.desktop_pairing_challenges(business_id,created_by,secret_hash,expires_at)
  values(target_business_id,actor,sha256(convert_to(code,'UTF8')),deadline);
  return query select code, deadline;
end;
$$;

-- Desktop must sign into the same Supabase Auth account. A stolen pairing
-- code alone is insufficient: the claiming user must be the issuing owner.
create function public.claim_desktop_pairing(
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
    and c.created_by = actor and c.consumed_at is null and c.expires_at > now()
  for update;
  if not found or not private.is_active_business_owner(challenge.business_id) then
    raise exception 'Invalid or expired pairing request' using errcode = '42501';
  end if;

  -- A local business cannot silently be linked to another hosted tenant.
  if exists (
    select 1 from private.desktop_devices d
    where d.local_business_public_id = claim_desktop_pairing.local_business_public_id
      and d.revoked_at is null and d.business_id <> challenge.business_id
  ) then
    raise exception 'Local business is already linked to another hosted business' using errcode = '23505';
  end if;

  insert into private.desktop_devices(
    business_id,local_business_public_id,device_public_id,paired_by
  ) values(challenge.business_id,btrim(local_business_public_id),device_public_id,actor)
  on conflict (device_public_id) do nothing
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

revoke all on function public.create_desktop_pairing(uuid) from public, anon, service_role;
revoke all on function public.claim_desktop_pairing(text,text,uuid) from public, anon, service_role;
grant execute on function public.create_desktop_pairing(uuid) to authenticated;
grant execute on function public.claim_desktop_pairing(text,text,uuid) to authenticated;
