-- Phase 1: safely update non-ledger stock metadata after a checkpoint.
-- This does not write on-hand balances, delete movement receipts, or post
-- inventory/accounting activity.

create table private.desktop_inventory_current_metadata (
  business_id uuid not null references public.businesses(id) on delete restrict,
  source_business_public_id text not null,
  local_product_id bigint not null check(local_product_id>0),
  reserved_milli bigint,
  damaged_milli bigint,
  minimum_milli bigint,
  maximum_milli bigint,
  updated_at timestamptz not null default now(),
  primary key(business_id,source_business_public_id,local_product_id)
);
alter table private.desktop_inventory_current_metadata enable row level security;
alter table private.desktop_inventory_current_metadata force row level security;
revoke all on private.desktop_inventory_current_metadata from public,anon,authenticated;

create or replace function public.upload_desktop_inventory_metadata(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  positions jsonb
)
returns integer
language plpgsql security definer set search_path=''
as $$
declare
  item jsonb;
  source_id bigint;
  column_name text;
  raw_value text;
  expected_count integer:=0;
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id
  );
  if positions is null or jsonb_typeof(positions)<>'array'
     or jsonb_array_length(positions)>5000 then
    raise exception 'Invalid inventory metadata snapshot' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-stock:' || target_business_id::text || ':' || source_business_public_id,0
  ));
  if not exists (
    select 1 from private.desktop_inventory_checkpoints c
    where c.business_id=target_business_id
      and c.source_business_public_id=source_business_public_id
      and c.source_device_public_id=source_device_public_id
  ) then
    raise exception 'Confirmed checkpoint required for inventory metadata'
      using errcode='23503';
  end if;
  if exists(
    select 1 from jsonb_array_elements(positions) e
    group by e->>'product_id' having count(*)>1
  ) then
    raise exception 'Duplicate metadata product ID' using errcode='22023';
  end if;

  for item in select value from jsonb_array_elements(positions) loop
    if jsonb_typeof(item)<>'object'
      or (item->>'product_id') !~ '^[1-9][0-9]*$'
      or length(item->>'product_id')>19 then
      raise exception 'Invalid product in inventory metadata' using errcode='22023';
    end if;
    -- Reject out-of-range values before converting untrusted JSON to bigint.
    if (item->>'product_id')::numeric > 9223372036854775807::numeric then
      raise exception 'Product ID exceeds bigint range' using errcode='22003';
    end if;
    source_id:=(item->>'product_id')::bigint;
    if not exists(
      select 1 from public.desktop_inventory_positions p
      where p.business_id=target_business_id
        and p.local_business_public_id=source_business_public_id
        and p.local_product_id=source_id and p.is_current
    ) then
      raise exception 'New stock products require an authorized source baseline'
        using errcode='23503';
    end if;

    foreach column_name in array array[
      'reserved_milli','damaged_milli','minimum_milli','maximum_milli'
    ] loop
      if not (item ? column_name) then
        raise exception 'Missing inventory field %',column_name using errcode='22023';
      end if;
      if item->column_name <> 'null'::jsonb then
        raw_value:=item->>column_name;
        if jsonb_typeof(item->column_name)<>'number'
           or raw_value !~ '^-?[0-9]+$'
           or length(raw_value)>20
           or raw_value::numeric < (-9223372036854775808)::numeric
           or raw_value::numeric > 9223372036854775807::numeric then
          raise exception 'Invalid inventory field %',column_name using errcode='22023';
        end if;
      end if;
    end loop;
    insert into private.desktop_inventory_current_metadata(
      business_id,source_business_public_id,local_product_id,
      reserved_milli,damaged_milli,minimum_milli,maximum_milli
    ) values (
      target_business_id,source_business_public_id,source_id,
      (item->>'reserved_milli')::bigint,(item->>'damaged_milli')::bigint,
      (item->>'minimum_milli')::bigint,(item->>'maximum_milli')::bigint
    ) on conflict(business_id,source_business_public_id,local_product_id)
    do update set reserved_milli=excluded.reserved_milli,
      damaged_milli=excluded.damaged_milli,
      minimum_milli=excluded.minimum_milli,
      maximum_milli=excluded.maximum_milli,updated_at=now();
    expected_count:=expected_count+1;
  end loop;
  delete from private.desktop_inventory_current_metadata m
   where m.business_id=target_business_id
     and m.source_business_public_id=source_business_public_id
     and not exists(
       select 1 from jsonb_array_elements(positions) e
       where (e->>'product_id')::bigint=m.local_product_id
     );
  return expected_count;
end $$;
revoke all on function public.upload_desktop_inventory_metadata(uuid,text,uuid,jsonb)
from public,anon,authenticated;
grant execute on function public.upload_desktop_inventory_metadata(uuid,text,uuid,jsonb)
to authenticated;

-- Upgrade the read model: on-hand comes only from accepted ledger replay,
-- while operational metadata can advance without overwriting the baseline.
create or replace function public.list_desktop_effective_inventory(
  target_business_id uuid
)
returns table(
  id uuid,product_id uuid,
  local_business_public_id text,local_product_id bigint,
  on_hand_milli bigint,reserved_milli bigint,damaged_milli bigint,
  minimum_milli bigint,maximum_milli bigint,is_current boolean,
  snapshot_at timestamptz,ledger_checkpoint_id uuid,ledger_movement_id bigint
)
language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null
     or not exists(
       select 1 from public.business_memberships m
       where m.business_id=target_business_id
         and m.user_id=(select auth.uid()) and m.active
     ) then
    raise exception 'Business membership required' using errcode='42501';
  end if;
  return query
    select p.id,p.product_id,p.local_business_public_id,p.local_product_id,
      coalesce(b.on_hand_milli,p.on_hand_milli),
      case when m.local_product_id is null then p.reserved_milli else m.reserved_milli end,
      case when m.local_product_id is null then p.damaged_milli else m.damaged_milli end,
      case when m.local_product_id is null then p.minimum_milli else m.minimum_milli end,
      case when m.local_product_id is null then p.maximum_milli else m.maximum_milli end,
      p.is_current,p.snapshot_at,c.id,
      coalesce(b.last_movement_id,c.movement_watermark)
    from public.desktop_inventory_positions p
    left join private.desktop_inventory_checkpoints c
      on c.business_id=p.business_id
     and c.source_business_public_id=p.local_business_public_id
    left join private.desktop_inventory_checkpoint_product_balances b
      on b.checkpoint_id=c.id and b.local_product_id=p.local_product_id
    left join private.desktop_inventory_current_metadata m
      on m.business_id=p.business_id
     and m.source_business_public_id=p.local_business_public_id
     and m.local_product_id=p.local_product_id
    where p.business_id=target_business_id and p.is_current
    order by p.local_product_id;
end $$;
revoke all on function public.list_desktop_effective_inventory(uuid)
from public,anon,authenticated;
grant execute on function public.list_desktop_effective_inventory(uuid) to authenticated;
