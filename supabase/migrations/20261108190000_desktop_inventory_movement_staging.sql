-- Phase 1A: hosted inventory movement staging, intentionally NOT exposed
-- through the Data API. An existing snapshot RPC can replace projections, so
-- live replay must remain disabled until the snapshot/replay hand-off is tested.
-- Database objects are additive: no existing stock or accounting rows change.

create table private.desktop_inventory_checkpoints (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  source_business_public_id text not null,
  source_device_public_id uuid not null,
  request_id uuid not null,
  movement_watermark bigint not null check (movement_watermark >= 0),
  positions jsonb not null check (jsonb_typeof(positions) = 'array'),
  recorded_at timestamptz not null default now(),
  unique (business_id, source_business_public_id, source_device_public_id),
  unique (business_id, source_device_public_id, request_id)
);

create table private.desktop_inventory_movement_receipts (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references private.desktop_inventory_checkpoints(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  source_business_public_id text not null,
  source_device_public_id uuid not null,
  event_id uuid not null,
  source_movement_id bigint not null check (source_movement_id > 0),
  previous_movement_id bigint not null check (previous_movement_id >= 0),
  local_product_id bigint not null check (local_product_id > 0),
  delta_milli bigint not null,
  before_milli bigint not null,
  after_milli bigint not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  accepted_at timestamptz not null default now(),
  unique (business_id, source_business_public_id, source_device_public_id, event_id),
  unique (business_id, source_business_public_id, source_device_public_id, source_movement_id)
);

create table private.desktop_inventory_movement_cursors (
  checkpoint_id uuid primary key references private.desktop_inventory_checkpoints(id) on delete restrict,
  latest_movement_id bigint not null check (latest_movement_id >= 0),
  updated_at timestamptz not null default now()
);

-- These tables are not directly writable by clients. RLS supplies a second
-- protection layer even if their schema becomes exposed in the future.
alter table private.desktop_inventory_checkpoints enable row level security;
alter table private.desktop_inventory_checkpoints force row level security;
alter table private.desktop_inventory_movement_receipts enable row level security;
alter table private.desktop_inventory_movement_receipts force row level security;
alter table private.desktop_inventory_movement_cursors enable row level security;
alter table private.desktop_inventory_movement_cursors force row level security;

revoke all on private.desktop_inventory_checkpoints from public, anon, authenticated;
revoke all on private.desktop_inventory_movement_receipts from public, anon, authenticated;
revoke all on private.desktop_inventory_movement_cursors from public, anon, authenticated;

-- Private helper for a future tested RPC. It deliberately accepts no client
-- identity as evidence: auth.uid() and the existing private owner predicate
-- are the only authorization sources.
create or replace function private.require_desktop_inventory_source(
  target_business_id uuid, source_business_public_id text, source_device_public_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner permission required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from private.desktop_devices d
    where d.business_id = target_business_id
      and d.device_public_id = source_device_public_id
      and d.local_business_public_id = source_business_public_id
      and d.paired_by = actor and d.revoked_at is null
  ) then
    raise exception 'Desktop source not authorized' using errcode = '42501';
  end if;
  return actor;
end;
$$;

revoke all on function private.require_desktop_inventory_source(uuid,text,uuid)
from public, anon, authenticated;

-- Stage a deterministic snapshot receipt. This does not change public stock.
-- The supplied snapshot must exactly agree with hosted inventory positions.
-- It also must be a non-empty, duplicate-free product set, with exact int8
-- quantities. Subsequent checkpoints require a separate audited migration.
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
     and c.source_business_public_id=source_business_public_id
     and c.source_device_public_id=source_device_public_id
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
        and p.local_business_public_id=source_business_public_id
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
    select p.on_hand_milli, p.is_current into remote_position
      from public.desktop_inventory_positions p
      where p.business_id=target_business_id
        and p.local_business_public_id=source_business_public_id
        and p.local_product_id=source_id;
    if not found or not remote_position.is_current
       or remote_position.on_hand_milli is distinct from (item->>'on_hand_milli')::bigint then
      raise exception 'Checkpoint stock differs from hosted position'
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

-- Neither staging helper is executable by client roles. Do not publish an
-- RPC wrapper until a consistent desktop checkpoint is persisted and the
-- existing snapshot endpoint has a post-checkpoint write guard.
