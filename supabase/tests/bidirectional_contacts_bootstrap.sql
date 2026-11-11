-- Disposable PostgreSQL test fixture. Never apply to a production project.
alter table private.desktop_devices
  add column paired_at timestamptz not null default now();
create table public.desktop_customers (
  id uuid primary key,
  business_id uuid not null,
  local_business_public_id text not null,
  source_public_id uuid not null,
  name text not null,
  email text,
  phone text,
  address text,
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);
create table public.desktop_suppliers (
  id uuid primary key,
  business_id uuid not null,
  local_business_public_id text not null,
  source_public_id uuid not null,
  name text not null,
  contact_person text,
  payment_terms text,
  email text,
  phone text,
  address text,
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);
create function private.require_desktop_inventory_source(
  target_business_id uuid, source_business_public_id text,
  source_device_public_id uuid
) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_business_owner(target_business_id) or not exists (
    select 1 from private.desktop_devices d
    where d.business_id=target_business_id
      and d.local_business_public_id=source_business_public_id
      and d.device_public_id=source_device_public_id
      and d.paired_by=(select auth.uid())
      and d.revoked_at is null
  ) then
    raise exception 'Source device not authorized' using errcode='42501';
  end if;
end $$;
insert into public.desktop_customers(
  id,business_id,local_business_public_id,source_public_id,name)
 values
 ('55555555-5555-4555-8555-555555555555',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
 '77777777-7777-4777-8777-777777777777','Original Customer');
insert into public.desktop_suppliers(
  id,business_id,local_business_public_id,source_public_id,name)
 values
 ('66666666-6666-4666-8666-666666666666',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','source-b',
 '88888888-8888-4888-8888-888888888888','Other Supplier');
