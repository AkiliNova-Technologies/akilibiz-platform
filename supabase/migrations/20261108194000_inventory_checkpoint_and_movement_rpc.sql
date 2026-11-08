-- Phase 1 desktop-to-cloud inventory handover.
-- Executing this migration intentionally exposes authenticated owner-only
-- checkpoint and movement RPCs. DO NOT deploy before isolated integration
-- validation and an explicit deployment approval.
-- No sale, purchase, inventory accounting, or tax posting is performed.

create or replace function public.confirm_desktop_inventory_checkpoint(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  checkpoint_request_id uuid,
  movement_watermark bigint,
  positions jsonb
)
returns table(hosted_checkpoint_id uuid, accepted_movement_watermark bigint)
language plpgsql security definer set search_path = ''
as $$
declare
  receipt_id uuid;
begin
  -- Private staging verifies the active owner/device, full snapshot, and
  -- existing hosted stock under the same source-scoped lock as snapshots.
  receipt_id := private.stage_desktop_inventory_checkpoint(
    target_business_id, source_business_public_id, source_device_public_id,
    checkpoint_request_id, movement_watermark, positions
  );
  return query select receipt_id, movement_watermark;
end
$$;
revoke all on function public.confirm_desktop_inventory_checkpoint(
  uuid,text,uuid,uuid,bigint,jsonb
) from public, anon, authenticated;
grant execute on function public.confirm_desktop_inventory_checkpoint(
  uuid,text,uuid,uuid,bigint,jsonb
) to authenticated;

create or replace function public.apply_desktop_inventory_movement(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  source_event_id uuid,
  source_movement_id bigint,
  previous_movement_id bigint,
  movement_payload jsonb
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
  -- Private staging enforces monotonic per-source cursor, exact arithmetic,
  -- product ownership, before/after balance and idempotency.
  return private.stage_desktop_inventory_movement(
    target_business_id, source_business_public_id, source_device_public_id,
    source_event_id, source_movement_id, previous_movement_id,
    movement_payload
  );
end
$$;
revoke all on function public.apply_desktop_inventory_movement(
  uuid,text,uuid,uuid,bigint,bigint,jsonb
) from public, anon, authenticated;
grant execute on function public.apply_desktop_inventory_movement(
  uuid,text,uuid,uuid,bigint,bigint,jsonb
) to authenticated;

-- Effective inventory read model: private replay does not directly mutate
-- public snapshot rows. The result is source-scoped and only readable by a
-- current business member; public inventory remains a historical baseline.
create or replace function public.list_desktop_effective_inventory(
  target_business_id uuid
)
returns table(
  id uuid,
  product_id uuid,
  local_business_public_id text,
  local_product_id bigint,
  on_hand_milli bigint,
  reserved_milli bigint,
  damaged_milli bigint,
  minimum_milli bigint,
  maximum_milli bigint,
  is_current boolean,
  snapshot_at timestamptz,
  ledger_checkpoint_id uuid,
  ledger_movement_id bigint
)
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not exists (
       select 1 from public.business_memberships m
       where m.business_id=target_business_id
         and m.user_id=(select auth.uid())
         and m.active
     ) then
    raise exception 'Business membership required' using errcode='42501';
  end if;

  return query
  select p.id,p.product_id,p.local_business_public_id,
    p.local_product_id,
    coalesce(b.on_hand_milli,p.on_hand_milli),
    p.reserved_milli,
    p.damaged_milli,
    p.minimum_milli,
    p.maximum_milli,
    p.is_current,p.snapshot_at,
    c.id,
    coalesce(b.last_movement_id,c.movement_watermark)
  from public.desktop_inventory_positions p
  left join private.desktop_inventory_checkpoints c
    on c.business_id=p.business_id
   and c.source_business_public_id=p.local_business_public_id
  left join private.desktop_inventory_checkpoint_product_balances b
    on b.checkpoint_id=c.id
   and b.local_product_id=p.local_product_id
  where p.business_id=target_business_id and p.is_current
  order by p.local_product_id;
end
$$;
revoke all on function public.list_desktop_effective_inventory(uuid)
from public, anon, authenticated;
grant execute on function public.list_desktop_effective_inventory(uuid) to authenticated;
