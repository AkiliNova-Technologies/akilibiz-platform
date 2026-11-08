-- Explicit owner-authorized contact directory snapshot.
-- Financial balances and sales relationships are deliberately excluded.
create table public.desktop_customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  local_business_public_id text not null,
  source_public_id uuid not null,
  name text not null check(char_length(btrim(name)) between 1 and 200),
  email text, phone text, address text,
  customer_type text not null,
  loyalty_points bigint not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(business_id,local_business_public_id,source_public_id)
);
create table public.desktop_suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  local_business_public_id text not null,
  source_public_id uuid not null,
  name text not null check(char_length(btrim(name)) between 1 and 200),
  contact_person text not null,
  phone text not null,
  email text, address text, payment_terms text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(business_id,local_business_public_id,source_public_id)
);
create index desktop_customers_business_idx on public.desktop_customers(business_id);
create index desktop_suppliers_business_idx on public.desktop_suppliers(business_id);
alter table public.desktop_customers enable row level security;
alter table public.desktop_suppliers enable row level security;
revoke all on public.desktop_customers,public.desktop_suppliers from public,anon,authenticated;
grant select on public.desktop_customers,public.desktop_suppliers to authenticated;
create policy desktop_customers_owner_read on public.desktop_customers for select to authenticated
using(private.is_active_business_owner(business_id));
create policy desktop_suppliers_owner_read on public.desktop_suppliers for select to authenticated
using(private.is_active_business_owner(business_id));

create function public.upload_desktop_contacts(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  customers jsonb,
  suppliers jsonb
) returns table(customers_uploaded integer,suppliers_uploaded integer)
language plpgsql security definer set search_path=''
as $$
declare
 actor uuid := (select auth.uid());
 rec jsonb;
 customer_count integer := 0;
 supplier_count integer := 0;
begin
 if actor is null or not private.is_active_business_owner(target_business_id) then
   raise exception 'Business owner access required' using errcode='42501';
 end if;
 if not exists (
   select 1 from private.desktop_devices d
   where d.business_id=target_business_id
     and d.local_business_public_id=source_business_public_id
     and d.device_public_id=source_device_public_id and d.paired_by=actor
     and d.revoked_at is null
 ) then
   raise exception 'Desktop device is not authorized' using errcode='42501';
 end if;
 if jsonb_typeof(customers)<>'array' or jsonb_typeof(suppliers)<>'array'
   or jsonb_array_length(customers)>5000 or jsonb_array_length(suppliers)>5000 then
   raise exception 'Invalid contact directory batch' using errcode='22023';
 end if;
 if exists(select 1 from (select e->>'public_id' id from jsonb_array_elements(customers) e group by 1 having count(*)>1) q)
    or exists(select 1 from (select e->>'public_id' id from jsonb_array_elements(suppliers) e group by 1 having count(*)>1) q) then
   raise exception 'Duplicate contact identity' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('akilibiz-directory:' || target_business_id::text || ':' || source_business_public_id,0));
 for rec in select value from jsonb_array_elements(customers) loop
   if jsonb_typeof(rec)<>'object'
     or char_length(btrim(coalesce(rec->>'name',''))) not between 1 and 200
     or char_length(btrim(coalesce(rec->>'customer_type',''))) not between 1 and 40
     or char_length(coalesce(rec->>'email',''))>320
     or char_length(coalesce(rec->>'phone',''))>40
     or char_length(coalesce(rec->>'address',''))>1000
     or jsonb_typeof(rec->'active')<>'boolean'
     or coalesce(rec->>'loyalty_points','') !~ '^[0-9]+$' then
     raise exception 'Invalid customer record' using errcode='22023';
   end if;
   insert into public.desktop_customers(
     business_id,local_business_public_id,source_public_id,name,email,phone,address,
     customer_type,loyalty_points,is_active
   ) values (
     target_business_id,source_business_public_id,(rec->>'public_id')::uuid,
     btrim(rec->>'name'),nullif(btrim(rec->>'email'),''),
     nullif(btrim(rec->>'phone'),''),nullif(btrim(rec->>'address'),''),
     btrim(rec->>'customer_type'),(rec->>'loyalty_points')::bigint,(rec->>'active')::boolean
   )
   on conflict(business_id,local_business_public_id,source_public_id)
   do update set name=excluded.name,email=excluded.email,phone=excluded.phone,
     address=excluded.address,customer_type=excluded.customer_type,
     loyalty_points=excluded.loyalty_points,is_active=excluded.is_active,updated_at=now();
   customer_count := customer_count + 1;
 end loop;
 for rec in select value from jsonb_array_elements(suppliers) loop
   if jsonb_typeof(rec)<>'object'
     or char_length(btrim(coalesce(rec->>'name',''))) not between 1 and 200
     or char_length(btrim(coalesce(rec->>'contact_person','')))>200
     or char_length(btrim(coalesce(rec->>'phone','')))>40
     or char_length(coalesce(rec->>'email',''))>320
     or char_length(coalesce(rec->>'address',''))>1000
     or char_length(btrim(coalesce(rec->>'payment_terms','')))>200
     or jsonb_typeof(rec->'active')<>'boolean' then
     raise exception 'Invalid supplier record' using errcode='22023';
   end if;
   insert into public.desktop_suppliers(
     business_id,local_business_public_id,source_public_id,name,contact_person,phone,
     email,address,payment_terms,is_active
   ) values (
     target_business_id,source_business_public_id,(rec->>'public_id')::uuid,
     btrim(rec->>'name'),btrim(rec->>'contact_person'),btrim(rec->>'phone'),
     nullif(btrim(rec->>'email'),''),nullif(btrim(rec->>'address'),''),
     btrim(rec->>'payment_terms'),(rec->>'active')::boolean
   )
   on conflict(business_id,local_business_public_id,source_public_id)
   do update set name=excluded.name,contact_person=excluded.contact_person,phone=excluded.phone,
     email=excluded.email,address=excluded.address,payment_terms=excluded.payment_terms,
     is_active=excluded.is_active,updated_at=now();
   supplier_count := supplier_count + 1;
 end loop;

 -- Snapshot absences deactivate only records for this origin; never hard-delete.
 update public.desktop_customers dc set is_active=false,updated_at=now()
 where dc.business_id=target_business_id and dc.local_business_public_id=source_business_public_id
   and dc.is_active and not exists(
     select 1 from jsonb_array_elements(customers) e
     where (e->>'public_id')::uuid=dc.source_public_id
   );
 update public.desktop_suppliers ds set is_active=false,updated_at=now()
 where ds.business_id=target_business_id and ds.local_business_public_id=source_business_public_id
   and ds.is_active and not exists(
     select 1 from jsonb_array_elements(suppliers) e
     where (e->>'public_id')::uuid=ds.source_public_id
   );
 insert into public.audit_events(business_id,actor_id,event_type,entity_type,entity_id,payload)
 values(target_business_id,actor,'desktop.contacts_uploaded','business',target_business_id,
   jsonb_build_object('customers',customer_count,'suppliers',supplier_count));
 return query select customer_count,supplier_count;
end;
$$;
revoke all on function public.upload_desktop_contacts(uuid,text,uuid,jsonb,jsonb) from public,anon,service_role;
grant execute on function public.upload_desktop_contacts(uuid,text,uuid,jsonb,jsonb) to authenticated;
