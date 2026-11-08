-- Explicit read-only stock-position snapshot. No stock movements or
-- inventory/COGS accounting entries are created by this replication.
create table public.desktop_inventory_positions (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 local_business_public_id text not null,
 local_product_id bigint not null check(local_product_id>0),
 product_id uuid not null,
 on_hand_milli bigint,
 reserved_milli bigint,
 damaged_milli bigint,
 minimum_milli bigint,
 maximum_milli bigint,
 is_current boolean not null default true,
 snapshot_at timestamptz not null default now(),
 unique(business_id,local_business_public_id,local_product_id),
 foreign key(business_id,product_id) references public.desktop_products(business_id,id)
);
create index desktop_inventory_business_idx on public.desktop_inventory_positions(business_id);
alter table public.desktop_inventory_positions enable row level security;
revoke all on public.desktop_inventory_positions from public,anon,authenticated;
grant select on public.desktop_inventory_positions to authenticated;
create policy desktop_inventory_owner_read on public.desktop_inventory_positions
for select to authenticated using(private.is_active_business_owner(business_id));

create function public.upload_desktop_inventory_positions(
 target_business_id uuid,
 source_business_public_id text,
 source_device_public_id uuid,
 positions jsonb
) returns integer
language plpgsql security definer set search_path=''
as $$
declare
 actor uuid := (select auth.uid());
 row_data jsonb;
 remote_product_id uuid;
 number_of_rows integer := 0;
begin
 if actor is null or not private.is_active_business_owner(target_business_id) then
   raise exception 'Business owner required' using errcode='42501';
 end if;
 if not exists (
   select 1 from private.desktop_devices d
   where d.business_id=target_business_id and d.device_public_id=source_device_public_id
     and d.local_business_public_id=source_business_public_id and d.paired_by=actor
     and d.revoked_at is null
 ) then
   raise exception 'Unrecognized desktop device' using errcode='42501';
 end if;
 if jsonb_typeof(positions)<>'array' or jsonb_array_length(positions)>5000 then
   raise exception 'Invalid inventory snapshot' using errcode='22023';
 end if;
 if exists(select 1 from (
   select e->>'product_id' from jsonb_array_elements(positions) e
   group by 1 having count(*)>1
 ) duplicates) then
   raise exception 'Duplicate stock position' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(
   'akilibiz-stock:' || target_business_id::text || ':' || source_business_public_id,0
 ));
 for row_data in select value from jsonb_array_elements(positions) loop
   if jsonb_typeof(row_data)<>'object'
     or (row_data->>'product_id') !~ '^[1-9][0-9]*$' then
     raise exception 'Invalid product identity in stock snapshot' using errcode='22023';
   end if;
   if exists(
     select 1 from jsonb_each(row_data) f
     where f.key in ('on_hand_milli','reserved_milli','damaged_milli','minimum_milli','maximum_milli')
       and f.value <> 'null'::jsonb
       and (jsonb_typeof(f.value)<>'number' or f.value::text !~ '^-?[0-9]+$')
   ) then
     raise exception 'Stock quantities must be exact integers or null' using errcode='22023';
   end if;
   select dp.id into remote_product_id from public.desktop_products dp
   where dp.business_id=target_business_id and dp.local_business_public_id=source_business_public_id
     and dp.local_product_id=(row_data->>'product_id')::bigint;
   if remote_product_id is null then
     raise exception 'Upload the corresponding catalogue before inventory' using errcode='23503';
   end if;
   insert into public.desktop_inventory_positions(
     business_id,local_business_public_id,local_product_id,product_id,
     on_hand_milli,reserved_milli,damaged_milli,minimum_milli,maximum_milli,is_current
   ) values(
     target_business_id,source_business_public_id,(row_data->>'product_id')::bigint,remote_product_id,
     (row_data->>'on_hand_milli')::bigint,(row_data->>'reserved_milli')::bigint,
     (row_data->>'damaged_milli')::bigint,(row_data->>'minimum_milli')::bigint,
     (row_data->>'maximum_milli')::bigint,true
   )
   on conflict(business_id,local_business_public_id,local_product_id)
   do update set product_id=excluded.product_id,on_hand_milli=excluded.on_hand_milli,
     reserved_milli=excluded.reserved_milli,damaged_milli=excluded.damaged_milli,
     minimum_milli=excluded.minimum_milli,maximum_milli=excluded.maximum_milli,
     is_current=true,snapshot_at=now();
   number_of_rows := number_of_rows+1;
 end loop;
 update public.desktop_inventory_positions p set is_current=false,snapshot_at=now()
 where p.business_id=target_business_id and p.local_business_public_id=source_business_public_id
 and p.is_current and not exists (
   select 1 from jsonb_array_elements(positions) e
   where (e->>'product_id')::bigint=p.local_product_id
 );
 insert into public.audit_events(business_id,actor_id,event_type,entity_type,entity_id,payload)
 values(target_business_id,actor,'desktop.inventory_snapshot','business',target_business_id,
   jsonb_build_object('positions',number_of_rows,'source','desktop'));
 return number_of_rows;
end;
$$;
revoke all on function public.upload_desktop_inventory_positions(uuid,text,uuid,jsonb)
 from public,anon,service_role;
grant execute on function public.upload_desktop_inventory_positions(uuid,text,uuid,jsonb)
 to authenticated;
