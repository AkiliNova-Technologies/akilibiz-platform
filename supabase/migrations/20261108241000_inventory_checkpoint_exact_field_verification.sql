-- Tighten the staged private checkpoint function after migrations 1900-1920.
-- A checkpoint must attest all inventory dimensions, not just on-hand units.
-- This does not expose or invoke the staging function on behalf of clients.
create or replace function private.stage_desktop_inventory_checkpoint(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  checkpoint_request_id uuid,
  movement_watermark bigint,
  positions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing private.desktop_inventory_checkpoints%rowtype;
  checkpoint_id uuid;
  item jsonb;
  source_id bigint;
  remote_position record;
  column_name text;
  raw_value text;
  seen_count integer := 0;
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id
  );
  if checkpoint_request_id is null or movement_watermark is null or movement_watermark < 0
     or positions is null or jsonb_typeof(positions) <> 'array'
     or jsonb_array_length(positions) > 5000 then
    raise exception 'Invalid checkpoint request' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-stock:' || target_business_id::text || ':' || source_business_public_id,0
  ));
  select * into existing from private.desktop_inventory_checkpoints c
   where c.business_id=target_business_id
     and c.source_business_public_id=stage_desktop_inventory_checkpoint.source_business_public_id
     and c.source_device_public_id=stage_desktop_inventory_checkpoint.source_device_public_id
   for update;
  if found then
    if existing.request_id=checkpoint_request_id
       and existing.movement_watermark=movement_watermark
       and existing.positions=positions then
      return existing.id;
    end if;
    raise exception 'Checkpoint already established for this desktop source'
      using errcode='23505';
  end if;
  if (select count(*) from public.desktop_inventory_positions p
      where p.business_id=target_business_id
        and p.local_business_public_id=stage_desktop_inventory_checkpoint.source_business_public_id
        and p.is_current) <> jsonb_array_length(positions) then
    raise exception 'Checkpoint snapshot count differs from current cloud stock'
      using errcode='23514';
  end if;
  for item in select value from jsonb_array_elements(positions) loop
    if jsonb_typeof(item)<>'object'
       or (item->>'product_id') !~ '^[1-9][0-9]*$'
       or (item->>'on_hand_milli') !~ '^-?[0-9]+$'
       or length(item->>'product_id') > 19
       or length(item->>'on_hand_milli') > 20 then
      raise exception 'Invalid checkpoint position' using errcode='22023';
    end if;
    source_id := (item->>'product_id')::bigint;
    if (select count(*) from jsonb_array_elements(positions) v
        where v->>'product_id'=item->>'product_id') <> 1 then
      raise exception 'Duplicate checkpoint product' using errcode='22023';
    end if;
    -- The source snapshot and hosted position must be exactly equal across
    -- all six inventory columns. Reject missing keys, non-integral values and
    -- numeric overflow before converting to int8.
    foreach column_name in array array[
      'on_hand_milli','reserved_milli','damaged_milli',
      'minimum_milli','maximum_milli'
    ] loop
      if not (item ? column_name) then
        raise exception 'Checkpoint field % is missing',column_name using errcode='22023';
      end if;
      if item->column_name <> 'null'::jsonb then
        raw_value := item->>column_name;
        if jsonb_typeof(item->column_name)<>'number'
           or raw_value !~ '^-?[0-9]+$'
           or abs(raw_value::numeric)>9223372036854775807::numeric then
          raise exception 'Checkpoint field % requires exact int8 or null',column_name
            using errcode='22023';
        end if;
      end if;
    end loop;
    select p.on_hand_milli,p.reserved_milli,p.damaged_milli,
      p.minimum_milli,p.maximum_milli,p.is_current into remote_position
      from public.desktop_inventory_positions p
      where p.business_id=target_business_id
        and p.local_business_public_id=stage_desktop_inventory_checkpoint.source_business_public_id
        and p.local_product_id=source_id;
    if not found or not remote_position.is_current
       or remote_position.on_hand_milli is distinct from (item->>'on_hand_milli')::bigint
       or remote_position.reserved_milli is distinct from (item->>'reserved_milli')::bigint
       or remote_position.damaged_milli is distinct from (item->>'damaged_milli')::bigint
       or remote_position.minimum_milli is distinct from (item->>'minimum_milli')::bigint
       or remote_position.maximum_milli is distinct from (item->>'maximum_milli')::bigint then
      raise exception 'Checkpoint inventory fields differ from hosted positions'
        using errcode='23514';
    end if;
    seen_count := seen_count+1;
  end loop;
  insert into private.desktop_inventory_checkpoints(
    business_id,source_business_public_id,source_device_public_id,
    request_id,movement_watermark,positions
  ) values (
    target_business_id,source_business_public_id,source_device_public_id,
    checkpoint_request_id,movement_watermark,positions
  ) returning id into checkpoint_id;
  insert into private.desktop_inventory_movement_cursors(checkpoint_id,latest_movement_id)
  values(checkpoint_id,movement_watermark);
  return checkpoint_id;
end;
$$;


revoke all on function private.stage_desktop_inventory_checkpoint(
  uuid,text,uuid,uuid,bigint,jsonb
) from public, anon, authenticated;
