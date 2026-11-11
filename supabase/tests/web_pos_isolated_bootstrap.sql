-- ISOLATED PostgreSQL qualification fixture. Never run against live Supabase.
-- Provides only the pre-existing Phase 1G contracts required to compile and
-- exercise staged web POS migrations in a throwaway database.
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
create type public.business_role as enum ('owner','manager','cashier','accountant','staff');
create table public.business_memberships(
 business_id uuid not null references public.businesses(id),
 user_id uuid not null references auth.users(id),
 role public.business_role not null,
 active boolean not null default true,
 primary key(business_id,user_id)
);
create table public.desktop_products(
 id uuid primary key,
 business_id uuid not null references public.businesses(id),
 local_business_public_id text not null,
 local_product_id bigint not null,
 name text not null,
 selling_price_ugx bigint,
 is_active boolean not null default true,
 unique(business_id,id),
 unique(business_id,local_business_public_id,local_product_id)
);
create table public.audit_events(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 actor_id uuid,
 event_type text not null,
 entity_type text not null,
 entity_id uuid,
 payload jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
create table private.desktop_devices(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 local_business_public_id text not null,
 device_public_id uuid not null,
 paired_by uuid not null,
 revoked_at timestamptz
);
create table private.desktop_inventory_checkpoints(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 source_business_public_id text not null,
 source_device_public_id uuid not null,
 movement_watermark bigint not null default 0
);
create table private.desktop_inventory_movement_cursors(
 checkpoint_id uuid primary key references private.desktop_inventory_checkpoints(id),
 latest_movement_id bigint not null default 0
);
create table private.desktop_inventory_movement_receipts(
 id uuid primary key default gen_random_uuid(),
 checkpoint_id uuid not null references private.desktop_inventory_checkpoints(id),
 business_id uuid not null,
 source_business_public_id text not null,
 source_device_public_id uuid not null,
 source_movement_id bigint not null,
 local_product_id bigint not null,
 delta_milli bigint not null,
 payload jsonb not null
);
create table public.test_inventory_positions(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 product_id uuid not null,
 local_business_public_id text not null,
 local_product_id bigint not null,
 on_hand_milli bigint,
 reserved_milli bigint,
 damaged_milli bigint,
 minimum_milli bigint,
 maximum_milli bigint,
 is_current boolean not null default true,
 snapshot_at timestamptz not null default now(),
 ledger_checkpoint_id uuid,
 ledger_movement_id bigint
);
create function public.list_desktop_effective_inventory(target_business_id uuid)
 returns table(
 id uuid,product_id uuid,local_business_public_id text,local_product_id bigint,
 on_hand_milli bigint,reserved_milli bigint,damaged_milli bigint,
 minimum_milli bigint,maximum_milli bigint,is_current boolean,
 snapshot_at timestamptz,ledger_checkpoint_id uuid,ledger_movement_id bigint
 ) language sql stable security definer set search_path='' as $$
 select p.id,p.product_id,p.local_business_public_id,p.local_product_id,
 p.on_hand_milli,p.reserved_milli,p.damaged_milli,p.minimum_milli,p.maximum_milli,
 p.is_current,p.snapshot_at,p.ledger_checkpoint_id,p.ledger_movement_id
 from public.test_inventory_positions p
 where p.business_id=target_business_id
 $$;
create function private.is_active_business_owner(target_business_id uuid)
 returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_memberships m
 where m.business_id=target_business_id and m.user_id=auth.uid()
 and m.active and m.role='owner')
 $$;
-- For exact scope: each tenant owns one desktop source and one test product.
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
insert into public.businesses(id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.business_memberships values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner',true),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner',true);
insert into private.desktop_devices(
 business_id,local_business_public_id,device_public_id,paired_by)
 values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
 '33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','source-b',
 '44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222');
insert into public.desktop_products(
 id,business_id,local_business_public_id,local_product_id,name,selling_price_ugx,is_active)
 values
 ('55555555-5555-4555-8555-555555555555',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',10,'Flour',4000,true),
 ('66666666-6666-4666-8666-666666666666',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','source-b',11,'Rice',5000,true);
insert into public.test_inventory_positions(
 business_id,product_id,local_business_public_id,local_product_id,
 on_hand_milli,reserved_milli,damaged_milli)
 values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '55555555-5555-4555-8555-555555555555','source-a',10,3000,0,0),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 '66666666-6666-4666-8666-666666666666','source-b',11,3000,0,0);
