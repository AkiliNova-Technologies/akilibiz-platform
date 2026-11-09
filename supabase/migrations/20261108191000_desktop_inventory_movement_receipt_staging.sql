-- Phase 1A: private movement replay staging. NOT externally callable.
-- Applies only to private projection state; it never posts inventory, sales,
-- accounting, tax or payment records. Live RPC activation is a later gate.

create table private.desktop_inventory_checkpoint_product_balances (
  checkpoint_id uuid not null references private.desktop_inventory_checkpoints(id) on delete restrict,
  local_product_id bigint not null check(local_product_id > 0),
  on_hand_milli bigint not null,
  last_movement_id bigint not null check(last_movement_id >= 0),
  primary key(checkpoint_id,local_product_id)
);

alter table private.desktop_inventory_checkpoint_product_balances enable row level security;
alter table private.desktop_inventory_checkpoint_product_balances force row level security;
revoke all on private.desktop_inventory_checkpoint_product_balances from public, anon, authenticated;

create or replace function private.stage_desktop_inventory_movement(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  source_event_id uuid,
  source_movement_id bigint,
  previous_movement_id bigint,
  movement_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  baseline private.desktop_inventory_checkpoints%rowtype;
  cursor_value bigint;
  prior private.desktop_inventory_movement_receipts%rowtype;
  product_id bigint;
  delta_value bigint;
  before_value bigint;
  after_value bigint;
  balance_value bigint;
  receipt_id uuid;
  numeric_delta numeric;
  numeric_before numeric;
  numeric_after numeric;
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id
  );
  if source_event_id is null or source_movement_id is null
     or source_movement_id <= 0 or previous_movement_id is null
     or previous_movement_id < 0
     or movement_payload is null or jsonb_typeof(movement_payload)<>'object'
     or (movement_payload->>'source_movement_id') !~ '^[1-9][0-9]*$'
     or (movement_payload->>'product_local_id') !~ '^[1-9][0-9]*$'
     or (movement_payload->>'quantity_change_milli') !~ '^-?[0-9]+$'
     or (movement_payload->>'stock_before_milli') !~ '^-?[0-9]+$'
     or (movement_payload->>'stock_after_milli') !~ '^-?[0-9]+$' then
    raise exception 'Invalid stock movement' using errcode='22023';
  end if;

  -- Numeric parsing first avoids int8 overflow changing the error semantics.
  numeric_delta := (movement_payload->>'quantity_change_milli')::numeric;
  numeric_before := (movement_payload->>'stock_before_milli')::numeric;
  numeric_after := (movement_payload->>'stock_after_milli')::numeric;
  if abs(numeric_delta)>9223372036854775807::numeric
     or abs(numeric_before)>9223372036854775807::numeric
     or abs(numeric_after)>9223372036854775807::numeric
     or numeric_before+numeric_delta<>numeric_after
     or numeric_after<0 then
    raise exception 'Movement quantities inconsistent or out of range'
      using errcode='22003';
  end if;
  product_id := (movement_payload->>'product_local_id')::bigint;
  delta_value := numeric_delta::bigint;
  before_value := numeric_before::bigint;
  after_value := numeric_after::bigint;
  if (movement_payload->>'source_movement_id')::bigint<>source_movement_id then
    raise exception 'Movement source ID differs from envelope' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-stock:' || target_business_id::text || ':' || source_business_public_id,0
  ));
  select * into baseline from private.desktop_inventory_checkpoints b
  where b.business_id=target_business_id
    and b.source_business_public_id=stage_desktop_inventory_movement.source_business_public_id
    and b.source_device_public_id=stage_desktop_inventory_movement.source_device_public_id;
  if not found then
    raise exception 'Verified inventory checkpoint required' using errcode='23503';
  end if;

  -- A repeated ID must bind to precisely the same payload and cursor context.
  select * into prior from private.desktop_inventory_movement_receipts r
  where r.business_id=target_business_id
    and r.source_business_public_id=stage_desktop_inventory_movement.source_business_public_id
    and r.source_device_public_id=stage_desktop_inventory_movement.source_device_public_id
    and (r.event_id=stage_desktop_inventory_movement.source_event_id
      or r.source_movement_id=stage_desktop_inventory_movement.source_movement_id);
  if found then
    if prior.event_id=source_event_id and prior.source_movement_id=source_movement_id
      and prior.previous_movement_id=previous_movement_id
      and prior.payload=movement_payload then
      return prior.id;
    end if;
    raise exception 'Conflicting movement replay identity' using errcode='23505';
  end if;
  select c.latest_movement_id into cursor_value
  from private.desktop_inventory_movement_cursors c
  where c.checkpoint_id=baseline.id for update;
  if not found or previous_movement_id<>cursor_value
     or source_movement_id<=cursor_value then
    raise exception 'Movement cursor mismatch or out of order'
      using errcode='23514';
  end if;

  -- Project all baseline products once, inside this serialized transaction.
  insert into private.desktop_inventory_checkpoint_product_balances(
    checkpoint_id,local_product_id,on_hand_milli,last_movement_id
  )
  select baseline.id,(item->>'product_id')::bigint,
    (item->>'on_hand_milli')::bigint,baseline.movement_watermark
  from jsonb_array_elements(baseline.positions) as item
  on conflict(checkpoint_id,local_product_id) do nothing;

  select b.on_hand_milli into balance_value
  from private.desktop_inventory_checkpoint_product_balances b
  where b.checkpoint_id=baseline.id and b.local_product_id=product_id for update;
  if not found then
    raise exception 'Movement product missing from checkpoint' using errcode='23503';
  end if;
  if balance_value<>before_value then
    raise exception 'Movement stock balance mismatches checkpoint projection'
      using errcode='23514';
  end if;

  update private.desktop_inventory_checkpoint_product_balances b
  set on_hand_milli=after_value,last_movement_id=source_movement_id
  where b.checkpoint_id=baseline.id and b.local_product_id=product_id;

  insert into private.desktop_inventory_movement_receipts(
    checkpoint_id,business_id,source_business_public_id,source_device_public_id,
    event_id,source_movement_id,previous_movement_id,local_product_id,
    delta_milli,before_milli,after_milli,payload
  ) values (
    baseline.id,target_business_id,source_business_public_id,source_device_public_id,
    source_event_id,source_movement_id,previous_movement_id,product_id,
    delta_value,before_value,after_value,movement_payload
  ) returning id into receipt_id;

  update private.desktop_inventory_movement_cursors
  set latest_movement_id=source_movement_id,updated_at=now()
  where checkpoint_id=baseline.id;

  return receipt_id;
end;
$$;

revoke all on function private.stage_desktop_inventory_movement(
  uuid,text,uuid,uuid,bigint,bigint,jsonb
) from public, anon, authenticated;

-- IMPORTANT: This stages monotonic cursor-linked movements but does not prove
-- no local source IDs were omitted. Desktop must supply audited continuous
-- source history between checkpoint and each delivery before public activation.
-- Do not expose this helper or call it for live stock until that proof and
-- post-checkpoint snapshot write exclusion are implemented and tested.
