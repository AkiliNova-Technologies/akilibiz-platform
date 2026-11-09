-- Desktop-origin business registration. One existing desktop business maps
-- to exactly one hosted business; retries never create a second tenant.
-- A different Supabase account cannot take ownership of an existing origin.
create table private.desktop_business_origins (
  local_business_public_id text primary key
    check (local_business_public_id ~ '^[0-9a-f]{32}$'),
  business_id uuid not null unique references public.businesses(id) on delete restrict,
  registered_by uuid not null references auth.users(id) on delete restrict,
  registered_at timestamptz not null default now()
);
create index desktop_business_origins_owner_idx
  on private.desktop_business_origins(registered_by);
revoke all on private.desktop_business_origins from public, anon, authenticated, service_role;

create function public.register_desktop_business(
  local_business_public_id text,
  device_public_id uuid,
  business_name text,
  business_trading_name text default null,
  business_contact_email text default null,
  business_contact_phone text default null,
  business_time_zone text default 'Africa/Kampala',
  business_currency_code text default 'UGX'
)
returns table(hosted_business_id uuid, hosted_device_id uuid, created boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  origin private.desktop_business_origins%rowtype;
  new_business_id uuid;
  device_row private.desktop_devices%rowtype;
  made boolean := false;
begin
  if actor is null then
    raise exception 'Sign in to register your desktop business' using errcode = '42501';
  end if;
  if local_business_public_id is null
    or local_business_public_id !~ '^[0-9a-f]{32}$'
    or device_public_id is null
    or business_name is null or char_length(btrim(business_name)) not between 1 and 160
    or business_time_zone is null or char_length(btrim(business_time_zone)) not between 1 and 63
    or business_currency_code is null or upper(btrim(business_currency_code)) !~ '^[A-Z]{3}$'
    or (business_trading_name is not null and char_length(btrim(business_trading_name)) > 160)
    or (business_contact_email is not null and char_length(btrim(business_contact_email)) > 320)
    or (business_contact_phone is not null and char_length(btrim(business_contact_phone)) > 32)
  then
    raise exception 'Invalid desktop business profile' using errcode = '22023';
  end if;

  -- Serialize operations for a given stable desktop identity, including the
  -- initial registration before its unique index entry exists.
  perform pg_advisory_xact_lock(
    hashtextextended('akilibiz-desktop-origin:' || local_business_public_id, 0)
  );

  select * into origin from private.desktop_business_origins o
  where o.local_business_public_id = register_desktop_business.local_business_public_id;

  if found then
    if origin.registered_by <> actor
      or not private.is_active_business_owner(origin.business_id) then
      raise exception 'Desktop business is registered to another cloud account' using errcode = '42501';
    end if;
    new_business_id := origin.business_id;
  else
    -- A previously paired desktop identity cannot silently create a new tenant.
    if exists (
      select 1 from private.desktop_devices d
      where d.local_business_public_id = register_desktop_business.local_business_public_id
        and d.revoked_at is null
    ) then
      raise exception 'Desktop business is already paired; use its existing cloud business'
        using errcode = '23505';
    end if;
    insert into public.businesses (
      name, trading_name, contact_email, contact_phone, time_zone,
      currency_code, locale, created_by
    ) values (
      btrim(business_name), nullif(btrim(business_trading_name),''),
      nullif(lower(btrim(business_contact_email)),''),
      nullif(btrim(business_contact_phone),''), btrim(business_time_zone),
      upper(btrim(business_currency_code)), 'en-UG', actor
    ) returning id into new_business_id;
    -- Existing businesses_create_owner_membership trigger ensures atomic owner membership.
    insert into private.desktop_business_origins(local_business_public_id,business_id,registered_by)
    values(local_business_public_id,new_business_id,actor);
    made := true;
  end if;

  select * into device_row from private.desktop_devices d
  where d.device_public_id = register_desktop_business.device_public_id
  for update;
  if found then
    if device_row.business_id <> new_business_id
      or device_row.local_business_public_id <> local_business_public_id
      or device_row.paired_by <> actor
      or device_row.revoked_at is not null then
      raise exception 'Device identity is already used or revoked' using errcode = '23505';
    end if;
  else
    insert into private.desktop_devices (
      business_id,local_business_public_id,device_public_id,paired_by
    ) values (new_business_id,local_business_public_id,device_public_id,actor)
    returning * into device_row;
  end if;

  if made then
    insert into public.audit_events(business_id,actor_id,event_type,entity_type,entity_id,payload)
    values(new_business_id,actor,'desktop.business_registered','business',new_business_id,
      jsonb_build_object('source','desktop'));
  end if;
  return query select new_business_id,device_row.id,made;
end;
$$;

revoke all on function public.register_desktop_business(text,uuid,text,text,text,text,text,text)
 from public, anon, service_role;
grant execute on function public.register_desktop_business(text,uuid,text,text,text,text,text,text)
 to authenticated;
