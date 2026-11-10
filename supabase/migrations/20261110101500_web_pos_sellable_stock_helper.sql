-- Private concurrency boundary for future web-originated POS writes.
-- Not part of the exposed Data API. No web checkout or client permission.
-- A caller must use the value and write its reservations before the current
-- SQL transaction commits; the advisory transaction lock is held until then.
--
-- This deliberately uses the same source-scoped lock as desktop checkpoint
-- and stock movement staging, and subtracts all web reservations that have
-- not been acknowledged into desktop inventory. No stock is mutated here.

create function private.web_pos_locked_sellable_milli(
  target_business_id uuid,
  target_product_id uuid
)
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  source_public_id text;
  stock record;
  held_total numeric;
  available numeric;
begin
  -- An unauthorized or inactive product has no sellable stock.
  select p.local_business_public_id
    into source_public_id
    from public.desktop_products p
   where p.business_id=target_business_id
     and p.id=target_product_id and p.is_active;
  if not found then return null; end if;

  -- Lock BEFORE reading effective source balances. This lock is also used
  -- by desktop position, checkpoint, metadata and movement mutations.
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-stock:' || target_business_id::text || ':' || source_public_id,0
  ));

  select
    coalesce(b.on_hand_milli,p.on_hand_milli) as on_hand_milli,
    case when m.local_product_id is null then p.reserved_milli
      else m.reserved_milli end as reserved_milli,
    case when m.local_product_id is null then p.damaged_milli
      else m.damaged_milli end as damaged_milli
    into stock
    from public.desktop_inventory_positions p
    join public.desktop_products product
      on product.business_id=p.business_id and product.id=p.product_id
    left join private.desktop_inventory_checkpoints c
      on c.business_id=p.business_id
      and c.source_business_public_id=p.local_business_public_id
    left join private.desktop_inventory_checkpoint_product_balances b
      on b.checkpoint_id=c.id and b.local_product_id=p.local_product_id
    left join private.desktop_inventory_current_metadata m
      on m.business_id=p.business_id
      and m.source_business_public_id=p.local_business_public_id
      and m.local_product_id=p.local_product_id
   where p.business_id=target_business_id
     and p.product_id=target_product_id and p.is_current
     and product.is_active and product.local_business_public_id=source_public_id;
  if not found or stock.on_hand_milli is null
    or stock.reserved_milli is null or stock.damaged_milli is null
    or stock.reserved_milli < 0 or stock.damaged_milli < 0 then
    return null;
  end if;

  select coalesce(sum(r.quantity_milli::numeric),0)
    into held_total
    from private.web_pos_stock_reservations r
    where r.business_id=target_business_id and r.product_id=target_product_id
      and r.state in ('held','consumed');

  available :=
    stock.on_hand_milli::numeric
    - stock.reserved_milli::numeric
    - stock.damaged_milli::numeric
    - held_total;

  -- All underlying values are exact integers. Do not overflow int8 or
  -- promote an unknown, negative or inconsistent stock balance.
  if available <= 0 then return 0; end if;
  if available > 9223372036854775807::numeric then return null; end if;
  return available::bigint;
end
$$;

revoke all on function private.web_pos_locked_sellable_milli(uuid,uuid)
  from public,anon,authenticated;
comment on function private.web_pos_locked_sellable_milli(uuid,uuid) is
  'Private, transaction-locking sellable stock read; not a public checkout RPC';
