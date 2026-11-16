-- Disposable purchase-order approval fixture. Never run against live data.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create schema private;

create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create table auth.users(id uuid primary key);
create table public.businesses(id uuid primary key);
create type public.business_role as enum
 ('owner','manager','cashier','inventory_staff','accountant');
create table public.business_memberships(
 business_id uuid not null references public.businesses(id),
 user_id uuid not null references auth.users(id),
 role public.business_role not null,
 active boolean not null default true,
 primary key(business_id,user_id)
);
create table public.desktop_suppliers(
 id uuid primary key,
 business_id uuid not null references public.businesses(id),
 local_business_public_id text not null,
 local_supplier_id bigint not null,
 source_public_id uuid not null,
 name text not null,
 is_active boolean not null default true,
 unique(business_id,local_business_public_id,local_supplier_id)
);
create table public.desktop_products(
 id uuid primary key,
 business_id uuid not null references public.businesses(id),
 local_business_public_id text not null,
 local_product_id bigint not null,
 name text not null,
 is_active boolean not null default true,
 unique(business_id,local_business_public_id,local_product_id)
);
create table private.desktop_devices(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 local_business_public_id text not null,
 device_public_id uuid not null,
 paired_by uuid not null references auth.users(id),
 paired_at timestamptz not null default now(),
 revoked_at timestamptz
);

create function private.is_active_business_owner(target_business_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_memberships m
 where m.business_id=target_business_id and m.user_id=(select auth.uid())
   and m.active and m.role='owner')
$$;
create function private.require_desktop_inventory_source(
 target_business_id uuid, source_business_public_id text,
 source_device_public_id uuid
) returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(
  select 1 from private.desktop_devices d
  join public.business_memberships m on m.business_id=d.business_id
   and m.user_id=(select auth.uid()) and m.active and m.role='owner'
  where d.business_id=target_business_id
   and d.local_business_public_id=source_business_public_id
   and d.device_public_id=source_device_public_id
   and d.paired_by=(select auth.uid()) and d.revoked_at is null
 ) then raise exception 'Desktop source access denied' using errcode='42501'; end if;
end $$;

insert into auth.users values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
insert into public.businesses values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.business_memberships values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner',true),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner',true);
insert into private.desktop_devices(
 business_id,local_business_public_id,device_public_id,paired_by) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','desktop-a','33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','desktop-b','44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222');
insert into public.desktop_suppliers values
 ('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','desktop-a',7,'77777777-7777-4777-8777-777777777777','Supplier A',true),
 ('66666666-6666-4666-8666-666666666666','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','desktop-b',8,'88888888-8888-4888-8888-888888888888','Supplier B',true);
insert into public.desktop_products values
 ('99999999-9999-4999-8999-999999999999','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','desktop-a',10,'Flour',true),
 ('aaaaaaaa-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','desktop-b',11,'Rice',true);

-- Match the read access supplied by the preceding tenancy/catalogue migrations.
grant usage on schema public,auth to authenticated;
grant select on public.businesses,public.business_memberships,
 public.desktop_suppliers,public.desktop_products to authenticated;
