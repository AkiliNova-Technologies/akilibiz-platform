-- Phase 1: platform identity and business tenancy.
-- Authorization is derived from database memberships, never from a browser-supplied
-- business_id. All public tables below are RLS protected and exposed read-only or
-- with narrowly scoped writes.

create type public.business_role as enum (
  'owner',
  'manager',
  'cashier',
  'inventory_staff',
  'accountant'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 120)
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_name_not_blank check (char_length(btrim(name)) between 1 and 160)
);

create table public.business_memberships (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.business_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_memberships_user_active_idx
  on public.business_memberships (user_id, business_id)
  where active;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_events_event_type_not_blank check (char_length(btrim(event_type)) between 1 and 120),
  constraint audit_events_entity_type_not_blank check (char_length(btrim(entity_type)) between 1 and 120),
  constraint audit_events_payload_is_object check (jsonb_typeof(payload) = 'object')
);

create index audit_events_business_occurred_at_idx
  on public.audit_events (business_id, occurred_at desc);

-- This function is deliberately private and has a fixed search path. It avoids
-- recursive membership policies while still filtering by the verified auth UID.
create schema if not exists private;

create function private.active_business_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select membership.business_id
  from public.business_memberships as membership
  where membership.user_id = (select auth.uid())
    and membership.active
$$;

revoke all on function private.active_business_ids() from public;
grant usage on schema private to authenticated;
grant execute on function private.active_business_ids() to authenticated;

-- A business and its owner membership are inserted by one database transaction.
-- The function is only trigger-invoked; execution is revoked from API roles.
create function public.create_business_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.business_memberships (business_id, user_id, role, active)
  values (new.id, new.created_by, 'owner', true);

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
    new.created_by,
    'business.created',
    'business',
    new.id,
    jsonb_build_object('name', new.name)
  );

  return new;
end;
$$;

revoke all on function public.create_business_owner_membership() from public;

create trigger businesses_create_owner_membership
  after insert on public.businesses
  for each row execute function public.create_business_owner_membership();

-- Audit records are append-only, including for table owners using normal DML.
create function public.prevent_audit_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_events are immutable';
end;
$$;

revoke all on function public.prevent_audit_event_mutation() from public;

create trigger audit_events_immutable
  before update or delete on public.audit_events
  for each row execute function public.prevent_audit_event_mutation();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.profiles, public.businesses, public.business_memberships, public.audit_events from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert on table public.businesses to authenticated;
grant select on table public.business_memberships to authenticated;
grant select on table public.audit_events to authenticated;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "businesses_select_active_membership"
  on public.businesses for select to authenticated
  using (id in (select private.active_business_ids()));

create policy "businesses_insert_creator_only"
  on public.businesses for insert to authenticated
  with check ((select auth.uid()) = created_by);

create policy "business_memberships_select_own"
  on public.business_memberships for select to authenticated
  using ((select auth.uid()) = user_id and active);

create policy "audit_events_select_active_membership"
  on public.audit_events for select to authenticated
  using (business_id in (select private.active_business_ids()));
