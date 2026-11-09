-- Phase 2: first-owner onboarding and owner-managed business profile details.
-- No tenant identifier is accepted for onboarding; the authenticated database
-- identity becomes the business creator and the existing trigger atomically
-- creates the owner membership and immutable business.created audit event.

alter table public.businesses
  add column trading_name text,
  add column contact_email text,
  add column contact_phone text,
  add column locale text not null default 'en-UG',
  add column time_zone text not null default 'Africa/Kampala',
  add column currency_code text not null default 'UGX',
  add constraint businesses_trading_name_not_blank
    check (trading_name is null or char_length(btrim(trading_name)) between 1 and 160),
  add constraint businesses_contact_email_length
    check (contact_email is null or char_length(btrim(contact_email)) between 3 and 320),
  add constraint businesses_contact_phone_length
    check (contact_phone is null or char_length(btrim(contact_phone)) between 3 and 32),
  add constraint businesses_locale_not_blank
    check (char_length(btrim(locale)) between 2 and 35),
  add constraint businesses_time_zone_not_blank
    check (char_length(btrim(time_zone)) between 1 and 63),
  add constraint businesses_currency_code_format
    check (currency_code ~ '^[A-Z]{3}$');

-- Avoid a membership-table RLS recursion when evaluating owner-only policies.
create function private.is_active_business_owner(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.business_memberships as membership
    where membership.business_id = target_business_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.active
  )
$$;

revoke all on function private.is_active_business_owner(uuid) from public;
grant execute on function private.is_active_business_owner(uuid) to authenticated;

-- The onboarding RPC accepts profile fields only. It derives the actor and
-- creator from auth.uid(), then relies on the existing AFTER INSERT trigger for
-- the owner membership and business.created audit event in the same transaction.
create function public.onboard_business(
  business_name text,
  business_trading_name text default null,
  business_contact_email text default null,
  business_contact_phone text default null,
  business_locale text default 'en-UG',
  business_time_zone text default 'Africa/Kampala',
  business_currency_code text default 'UGX'
)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_business public.businesses;
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception 'An authenticated user is required to create a business';
  end if;

  insert into public.businesses (
    name,
    trading_name,
    contact_email,
    contact_phone,
    locale,
    time_zone,
    currency_code,
    created_by
  )
  values (
    btrim(business_name),
    nullif(btrim(business_trading_name), ''),
    nullif(lower(btrim(business_contact_email)), ''),
    nullif(btrim(business_contact_phone), ''),
    btrim(business_locale),
    btrim(business_time_zone),
    upper(btrim(business_currency_code)),
    actor_id
  )
  returning * into created_business;

  return created_business;
end;
$$;

revoke all on function public.onboard_business(text, text, text, text, text, text, text)
  from public, anon, service_role;
grant execute on function public.onboard_business(text, text, text, text, text, text, text)
  to authenticated;

-- Only the profile columns are writable by API clients. created_by and all
-- tenancy identifiers remain non-writable after creation.
grant update (
  name,
  trading_name,
  contact_email,
  contact_phone,
  locale,
  time_zone,
  currency_code
) on table public.businesses to authenticated;

create policy "businesses_update_active_owner_only"
  on public.businesses for update to authenticated
  using (private.is_active_business_owner(id))
  with check (private.is_active_business_owner(id));

create function private.set_business_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_business_updated_at() from public;

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function private.set_business_updated_at();

-- Audit only the names of changed profile fields, not contact values.
create function public.audit_business_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_fields text[];
begin
  changed_fields := array_remove(array[
    case when new.name is distinct from old.name then 'name' end,
    case when new.trading_name is distinct from old.trading_name then 'trading_name' end,
    case when new.contact_email is distinct from old.contact_email then 'contact_email' end,
    case when new.contact_phone is distinct from old.contact_phone then 'contact_phone' end,
    case when new.locale is distinct from old.locale then 'locale' end,
    case when new.time_zone is distinct from old.time_zone then 'time_zone' end,
    case when new.currency_code is distinct from old.currency_code then 'currency_code' end
  ], null);

  if cardinality(changed_fields) = 0 then
    return new;
  end if;

  insert into public.audit_events (
    business_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values (
    new.id,
    (select auth.uid()),
    'business.profile_updated',
    'business',
    new.id,
    jsonb_build_object('changed_fields', to_jsonb(changed_fields))
  );

  return new;
end;
$$;

revoke all on function public.audit_business_profile_update() from public, anon, authenticated, service_role;

create trigger businesses_audit_profile_update
  after update on public.businesses
  for each row execute function public.audit_business_profile_update();
